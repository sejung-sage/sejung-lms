import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { selectAll } from "@/lib/db-all";
import type { Slot } from "@/lib/hq";

/**
 * 강사 앱의 첫 화면 — 강좌 카드.
 * 강사는 강좌를 고른 뒤 그 안에서 출석·숙제·성적을 본다 (강좌 단위로 섞이지 않게).
 */

const db = () => createAdminClient();

export type CourseCard = {
  id: string; title: string; subject: string | null; kind: "regular" | "special"; isClosed: boolean;
  slots: Slot[]; students: number; capacity: number | null;
  next: { at: string; no: number | null } | null;
  /** 지난 수업 수 / 전체 회차 */
  done: number; totalSessions: number;
  assistants: string[];
  openTodos: number;
  lastExam: { title: string; avg: number } | null;
};

export async function getSpaceCourses(spaceId: string, only: "all" | string[]): Promise<CourseCard[]> {
  if (only !== "all" && !only.length) return [];
  let cq = db().from("classes")
    .select("id, title, subject, kind, is_closed, slots, capacity, total_sessions, starts_on")
    .eq("space_id", spaceId);
  if (only !== "all") cq = cq.in("id", only);
  const { data: classes } = await cq.order("is_closed").order("starts_on", { ascending: false });
  const ids = (classes ?? []).map((c) => c.id);
  if (!ids.length) return [];

  type P = { full_name: string | null };
  const [members, sessions, staff, todos, exams] = await Promise.all([
    selectAll<{ class_id: string }>("class_members", "class_id", (q) => q.in("class_id", ids)),
    selectAll<{ class_id: string; scheduled_at: string | null; session_no: number | null }>("sessions", "class_id, scheduled_at, session_no", (q) => q.in("class_id", ids)),
    selectAll<{ class_id: string; profiles: P | P[] | null }>("class_staff", "class_id, profiles(full_name)", (q) => q.in("class_id", ids)),
    selectAll<{ class_id: string }>("todos", "class_id", (q) => q.in("class_id", ids).eq("state", "open")),
    selectAll<{ class_id: string; title: string; exam_date: string | null; max_score: number | null; exam_results: { score: number | null }[] }>(
      "exams", "class_id, title, exam_date, max_score, exam_results(score)", (q) => q.in("class_id", ids)),
  ]);
  const now = Date.now();
  const cnt = (rows: { class_id: string }[], id: string) => rows.filter((r) => r.class_id === id).length;

  return (classes ?? []).map((c) => {
    const ss = sessions.filter((s) => s.class_id === c.id && s.scheduled_at).sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!));
    const next = ss.find((s) => new Date(s.scheduled_at!).getTime() >= now - 3 * 3600_000);
    const graded = exams
      .filter((e) => e.class_id === c.id && (e.exam_results ?? []).some((r) => r.score != null))
      .sort((a, b) => (b.exam_date ?? "").localeCompare(a.exam_date ?? ""))[0];
    const scores = (graded?.exam_results ?? []).filter((r) => r.score != null).map((r) => Number(r.score));
    return {
      id: c.id, title: c.title, subject: c.subject, kind: c.kind, isClosed: c.is_closed,
      slots: (c.slots ?? []) as Slot[], students: cnt(members, c.id), capacity: c.capacity,
      next: next ? { at: next.scheduled_at!, no: next.session_no } : null,
      done: ss.filter((s) => new Date(s.scheduled_at!).getTime() < now).length,
      totalSessions: c.total_sessions ?? ss.length,
      assistants: staff.filter((s) => s.class_id === c.id)
        .map((s) => (Array.isArray(s.profiles) ? s.profiles[0]?.full_name : s.profiles?.full_name) ?? "").filter(Boolean),
      openTodos: cnt(todos, c.id),
      lastExam: graded && scores.length
        ? { title: graded.title, avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length / Number(graded.max_score ?? 100)) * 100) }
        : null,
    };
  });
}
