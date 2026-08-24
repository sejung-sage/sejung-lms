"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 매직링크의 쓰기는 전부 여기 있다. 페이지 렌더(GET)에서는 아무것도 쓰지 않는다.
 *
 * 이유: 이 링크는 알림톡·문자로 나간다. 카카오톡/슬랙의 링크 미리보기 봇,
 * 백신·메일 게이트웨이 스캐너, 브라우저 프리페치가 전부 GET 을 날린다.
 * 렌더에서 등원을 기록하면 학생이 오지도 않았는데 등원 처리가 된다.
 * 그래서 상태 변경은 사람이 버튼을 눌러야(POST) 일어난다.
 */

type Guard =
  | { ok: true; id: string; targetId: string }
  | { ok: false };

/** 토큰을 검증하고 대상 예약 id 를 돌려준다. 만료·이미처리는 통과시키지 않는다. */
async function guard(token: string, action: "clinic_arrived" | "clinic_departed"): Promise<Guard> {
  const db = createAdminClient();
  const { data } = await db
    .from("magic_links")
    .select("id, action, target_id, expires_at, consumed_at")
    .eq("token", token)
    .maybeSingle();

  if (!data || data.action !== action || !data.target_id) return { ok: false };
  if (new Date(data.expires_at).getTime() < Date.now()) return { ok: false };
  if (data.consumed_at) return { ok: false };

  return { ok: true, id: data.id, targetId: data.target_id };
}

/** 소비 표시 — 이미 소비됐으면 덮어쓰지 않는다(동시 요청 대비) */
async function consume(id: string, at: string) {
  const db = createAdminClient();
  await db.from("magic_links").update({ consumed_at: at }).eq("id", id).is("consumed_at", null);
}

/* ── 등원 처리 ───────────────────────────────────
   기존에는 페이지가 열리기만 해도 실행됐다. 이제 버튼을 눌러야 실행된다. */

export async function confirmClinicArrival(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/");

  const g = await guard(token, "clinic_arrived");
  if (!g.ok) redirect(`/l/${token}`);

  const now = new Date().toISOString();
  const db = createAdminClient();

  // arrived_at 이 비어 있을 때만 — 두 번 눌러도 최초 등원 시각이 유지된다
  await db
    .from("clinic_reservations")
    .update({ status: "arrived", arrived_at: now, updated_at: now })
    .eq("id", g.targetId)
    .is("arrived_at", null);

  await consume(g.id, now);
  redirect(`/l/${token}`);
}

/* ── 하원 처리 (+ 조교 피드백) ────────────────── */

export async function submitClinicDeparture(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const feedback = String(formData.get("feedback") ?? "").trim();
  if (!token) redirect("/");

  const g = await guard(token, "clinic_departed");
  if (!g.ok) redirect(`/l/${token}`);

  const now = new Date().toISOString();
  const db = createAdminClient();

  await db
    .from("clinic_reservations")
    .update({
      status: "departed",
      departed_at: now,
      feedback: feedback || null,
      updated_at: now,
    })
    .eq("id", g.targetId)
    .is("departed_at", null);

  await consume(g.id, now);
  redirect(`/l/${token}`);
}

/* ── 열람 기록 ───────────────────────────────────
   view_count 도 쓰기라서 렌더에서 뺐다. 브라우저가 실제로 스크립트를
   돌렸을 때만 기록되므로, JS 를 실행하지 않는 미리보기 봇은 집계에 안 잡힌다. */

export async function recordLinkView(token: string) {
  if (!token) return;
  const db = createAdminClient();
  const { data } = await db
    .from("magic_links")
    .select("id, view_count")
    .eq("token", token)
    .maybeSingle();
  if (!data) return;

  await db
    .from("magic_links")
    .update({ view_count: (data.view_count ?? 0) + 1, last_viewed_at: new Date().toISOString() })
    .eq("id", data.id);
}
