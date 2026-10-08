import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 학부모 리포트 링크 현황 — 재원생마다 보호자 번호와 가장 최근에 만든 리포트 링크.
 * 링크 자체(magic_links.action = 'report')는 로그인 없이 열리는 읽기 전용 화면이다.
 */

export type ReportTarget = {
  studentId: string;
  name: string;
  parentName: string | null;
  parentPhone: string | null;
  last: { token: string; createdAt: string; expiresAt: string; views: number; lastViewedAt: string | null } | null;
};

export async function getReportTargets(spaceId: string): Promise<ReportTarget[]> {
  const db = createAdminClient();
  const [enrRes, linkRes] = await Promise.all([
    db.from("enrollments")
      .select("students!inner(id, name, parent_links(parents(name, phone)))")
      .eq("space_id", spaceId).eq("status", "active"),
    db.from("magic_links")
      .select("student_id, token, created_at, expires_at, view_count, last_viewed_at")
      .eq("space_id", spaceId).eq("action", "report")
      .order("created_at", { ascending: false }),
  ]);
  type P = { name: string; phone: string | null };
  type S = { id: string; name: string; parent_links: { parents: P | P[] | null }[] };
  const students = (enrRes.data ?? []).flatMap((r: { students: S | S[] }) => (Array.isArray(r.students) ? r.students : [r.students]));
  const latest = new Map<string, NonNullable<ReportTarget["last"]>>();
  for (const l of linkRes.data ?? []) {
    if (!l.student_id || latest.has(l.student_id)) continue;
    latest.set(l.student_id, { token: l.token, createdAt: l.created_at, expiresAt: l.expires_at, views: l.view_count, lastViewedAt: l.last_viewed_at });
  }
  return students
    .map((s) => {
      const p = s.parent_links?.flatMap((l) => [l.parents].flat()).find((x) => x?.phone) ?? null;
      return { studentId: s.id, name: s.name, parentName: p?.name ?? null, parentPhone: p?.phone ?? null, last: latest.get(s.id) ?? null };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
