"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSpaceBySlug } from "@/lib/spaces";
import { staffForAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 학부모 리포트 링크 만들기.
 *
 * 토큰은 추측할 수 없는 무작위 32바이트 — 이 링크는 로그인 없이 열리므로 토큰이 곧 열쇠다.
 * 알림톡은 아직 발송 연동 전이라, 링크를 만들어 돌려주고 화면에서 '문자로 보내기'·'복사'로 전달한다.
 */

export type ReportLinkState = { ok: boolean; message: string; url?: string; phone?: string | null; at?: number };

const DAYS = 14;

export async function createReportLink(slug: string, studentId: string, _prev: ReportLinkState): Promise<ReportLinkState> {
  void _prev;
  const space = await getSpaceBySlug(slug);
  if (!space?.id) return { ok: false, message: "공간을 찾을 수 없어요" };
  const st = await staffForAction(space.id);
  if (!st) return { ok: false, message: "운영진만 보낼 수 있어요" };

  const db = createAdminClient();
  // 이 공간 재원생인지 + 보호자 번호
  const { data: enr } = await db.from("enrollments")
    .select("students!inner(id, name, parent_links(parents(id, phone)))")
    .eq("space_id", space.id).eq("student_id", studentId).eq("status", "active").maybeSingle();
  if (!enr) return { ok: false, message: "이 공간 재원생이 아니에요" };
  type P = { id: string; phone: string | null };
  const s = (Array.isArray(enr.students) ? enr.students[0] : enr.students) as { parent_links: { parents: P | P[] | null }[] };
  const parent = s.parent_links?.flatMap((l) => [l.parents].flat()).find((p) => p?.phone) ?? null;

  const token = randomBytes(32).toString("base64url");
  const { error } = await db.from("magic_links").insert({
    token,
    space_id: space.id,
    action: "report",
    student_id: studentId,
    payload: { parent_id: parent?.id ?? null, phone: parent?.phone ?? null, channel: "manual" },
    expires_at: new Date(Date.now() + DAYS * 86400_000).toISOString(),
    created_by: st.viewer.userId,
  });
  if (error) return { ok: false, message: `링크를 만들지 못했어요: ${error.message}` };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "sejung-lms.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  revalidatePath(`/s/${slug}/admin/students`);
  return { ok: true, message: `${DAYS}일 동안 열리는 링크를 만들었어요`, url: `${proto}://${host}/l/${token}`, phone: parent?.phone ?? null, at: Date.now() };
}
