import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SpaceDetail } from "@/lib/spaces";

/**
 * 학부모 화면 — 자녀 중심.
 * 자녀 한 명이 여러 강사의 강좌를 들어도 한 화면에서 강좌별로 본다.
 */

const db = () => createAdminClient();
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export type ChildRef = { id: string; name: string; school: string | null; grade: string | null };

export async function getChildren(childIds: string[]): Promise<ChildRef[]> {
  if (!childIds.length) return [];
  const { data } = await db().from("students").select("id, name, school, grade").in("id", childIds);
  return (data ?? []).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export type ChildCourse = {
  id: string; title: string; kind: "regular" | "special";
  space: SpaceDetail & { teacher: string };
  slots: { weekday: string; start_time: string; room_name: string | null }[];
  attendance: { ok: number; total: number };
  homework: { done: number; total: number };
  lastTest: { title: string; pct: number } | null;
  trend: number[];
  next: string | null;
};

const PRESENT = new Set(["present", "video", "late", "early_leave"]);

/** 자녀가 듣는 모든 강좌 (강사 상관없이) + 강좌별 요약 */
export async function getChildCourses(studentId: string): Promise<ChildCourse[]> {
  const { data: mem } = await db().from("class_members")
    .select("class_id, classes!inner(id, title, kind, slots, is_closed, teacher_spaces!inner(id, name, subject, slug, accent_color))")
    .eq("student_id", studentId);
  type S = { id: string; name: string; subject: string | null; slug: string | null; accent_color: string };
  type C = { id: string; title: string; kind: "regular" | "special"; slots: ChildCourse["slots"] | null; is_closed: boolean; teacher_spaces: S | S[] };
  const classes = (mem ?? []).map((m: { classes: C | C[] }) => one(m.classes)!).filter(Boolean);
  const ids = classes.map((c) => c.id);
  if (!ids.length) return [];

  const today = new Date().toISOString().slice(0, 10);
  const [att, exams, asg, ses] = await Promise.all([
    db().from("attendance").select("status, sessions!inner(class_id)").eq("student_id", studentId).in("sessions.class_id", ids),
    db().from("exams").select("class_id, title, max_score, exam_date, exam_results!inner(score, student_id)")
      .in("class_id", ids).eq("exam_results.student_id", studentId).order("exam_date"),
    db().from("assignments").select("class_id, due_date, submissions!inner(status, student_id)")
      .in("class_id", ids).eq("submissions.student_id", studentId).lte("due_date", today),
    db().from("sessions").select("class_id, scheduled_at").in("class_id", ids).gte("scheduled_at", new Date(Date.now() - 3 * 3600_000).toISOString()).order("scheduled_at"),
  ]);
  type A = { status: string; sessions: { class_id: string } | { class_id: string }[] };
  type E = { class_id: string; title: string; max_score: number | null; exam_results: { score: number | null }[] };
  type H = { class_id: string; submissions: { status: string }[] };

  return classes
    .sort((a, b) => Number(a.is_closed) - Number(b.is_closed) || a.title.localeCompare(b.title, "ko"))
    .map((c) => {
      const sp = one(c.teacher_spaces)!;
      const myAtt = ((att.data ?? []) as A[]).filter((r) => one(r.sessions)?.class_id === c.id && r.status !== "undecided");
      const myExams = ((exams.data ?? []) as E[]).filter((e) => e.class_id === c.id && e.exam_results?.[0]?.score != null);
      const pcts = myExams.map((e) => Math.round((Number(e.exam_results[0].score) / Number(e.max_score ?? 100)) * 100));
      const myAsg = ((asg.data ?? []) as H[]).filter((a) => a.class_id === c.id);
      const last = myExams[myExams.length - 1];
      return {
        id: c.id, title: c.title, kind: c.kind, slots: c.slots ?? [],
        space: { id: sp.id, name: sp.name, subject: sp.subject, slug: sp.slug, accent_color: sp.accent_color, teacher: sp.name },
        attendance: { ok: myAtt.filter((r) => PRESENT.has(r.status)).length, total: myAtt.length },
        homework: { done: myAsg.filter((a) => ["submitted", "late"].includes(a.submissions?.[0]?.status)).length, total: myAsg.length },
        lastTest: last ? { title: last.title, pct: pcts[pcts.length - 1] } : null,
        trend: pcts.slice(-6),
        next: (ses.data ?? []).find((x) => x.class_id === c.id)?.scheduled_at ?? null,
      };
    });
}

/** 자녀가 이 강좌를 듣는지 + 강좌·강사 정보 */
export async function getChildCourse(studentId: string, classId: string) {
  const { data } = await db().from("class_members")
    .select("classes!inner(id, title, teacher_spaces!inner(id, name, subject, slug, accent_color))")
    .eq("student_id", studentId).eq("class_id", classId).maybeSingle();
  if (!data) return null;
  type S = { id: string; name: string; subject: string | null; slug: string | null; accent_color: string };
  const c = one(data.classes as { id: string; title: string; teacher_spaces: S | S[] } | { id: string; title: string; teacher_spaces: S | S[] }[])!;
  const sp = one(c.teacher_spaces)!;
  return { id: c.id, title: c.title, space: { id: sp.id, name: sp.name, subject: sp.subject, slug: sp.slug, accent_color: sp.accent_color } as SpaceDetail };
}
