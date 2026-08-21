import { createAdminClient } from "@/lib/supabase/admin";
import {
  mockStudents, mockAttendance, mockHomework, mockGrades, mockApprovals,
  type Student, type AttendanceRow, type HwRow, type GradeRow, type ApprovalRow,
} from "@/lib/mock/admin";
import type { SpaceDetail } from "@/lib/spaces";

/**
 * 관리자 하위화면 데이터 seam.
 *
 * 화면 타입(Student/AttendanceRow/…)은 목에서 이미 정해져 있으므로 그대로 쓴다.
 * 실 DB 구현은 "화면 타입을 만족시키되, 없는 값은 지어내지 않는다"가 원칙이다.
 * 예: 계정 승인은 테이블 자체가 없어서 항상 빈 배열이다 (PRD M2).
 */
const useMock = process.env.USE_MOCK_DB === "true";

const db = () => createAdminClient();
const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

/** 출석으로 치는 상태 — 결석/부재/퇴원만 빠진다 */
const PRESENT_ISH = new Set(["present", "video", "late", "early_leave"]);
const ATT_LABEL: Record<string, AttendanceRow["status"]> = {
  present: "출석", video: "출석", late: "지각", early_leave: "지각",
  absent: "결석", withdrawn: "결석", none: "결석", undecided: "예정",
};

const hhmm = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }) : "—";

type EnrolledStudent = { id: string; name: string; school: string | null; grade: string | null; phone: string | null; status: string };

async function roster(spaceId: string): Promise<EnrolledStudent[]> {
  const { data } = await db()
    .from("enrollments")
    .select("students!inner(id, name, school, grade, phone, status)")
    .eq("space_id", spaceId);
  const rows = (data ?? []).flatMap((r: { students: EnrolledStudent | EnrolledStudent[] }) =>
    Array.isArray(r.students) ? r.students : [r.students],
  );
  return rows.sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/* ── 학생 목록 ─────────────────────────────────── */

export async function getAdminStudents(space: SpaceDetail): Promise<Student[]> {
  if (useMock) return mockStudents(space.subject ?? "정규");
  if (!space.id) return [];

  const [people, attRes, asgRes] = await Promise.all([
    roster(space.id),
    db().from("attendance").select("student_id, status, sessions!inner(classes(title))").eq("space_id", space.id),
    db().from("assignments").select("id, due_date, submissions(student_id, status)").eq("space_id", space.id),
  ]);

  type AttRow = { student_id: string; status: string; sessions: { classes: { title: string } | { title: string }[] | null } | { classes: { title: string } | { title: string }[] | null }[] };
  const att = new Map<string, { n: number; ok: number; cls: string }>();
  for (const r of (attRes.data ?? []) as AttRow[]) {
    if (r.status === "undecided") continue;
    const cur = att.get(r.student_id) ?? { n: 0, ok: 0, cls: "—" };
    cur.n += 1;
    if (PRESENT_ISH.has(r.status)) cur.ok += 1;
    const cls = one(one(r.sessions)?.classes);
    if (cls?.title) cur.cls = cls.title;
    att.set(r.student_id, cur);
  }

  // 마감 전 과제는 제출률 분모에서 뺀다 (학생앱과 같은 기준)
  type AsgRow = { id: string; due_date: string | null; submissions: { student_id: string; status: string }[] };
  const todayStr = new Date().toISOString().slice(0, 10);
  const asgs = ((asgRes.data ?? []) as AsgRow[]).filter((a) => (a.due_date ?? "") <= todayStr);
  const hw = new Map<string, number>();
  for (const p of people) {
    const done = asgs.filter((a) =>
      (a.submissions ?? []).some((s) => s.student_id === p.id && (s.status === "submitted" || s.status === "late")),
    ).length;
    hw.set(p.id, asgs.length ? Math.round((done / asgs.length) * 100) : 100);
  }

  return people.map((p) => {
    const a = att.get(p.id);
    return {
      name: p.name,
      school: p.school ?? "—",
      grade: p.grade ?? "—",
      phone: p.phone ?? "—",
      className: a?.cls ?? "—",
      attendanceRate: a && a.n ? Math.round((a.ok / a.n) * 100) : 0,
      hwRate: hw.get(p.id) ?? 0,
      status: p.status === "active" ? "재원" : "휴원",
    };
  });
}

/* ── 출석 관리 : 가장 최근 출결이 찍힌 차시 ────── */

export async function getAdminAttendance(space: SpaceDetail): Promise<{ session: string; rows: AttendanceRow[] }> {
  if (useMock) return mockAttendance(space.subject ?? "정규");
  if (!space.id) return { session: "차시 없음", rows: [] };

  const { data } = await db()
    .from("attendance")
    .select("status, marked_at, students!inner(name), sessions!inner(id, session_no, scheduled_at, classes(title))")
    .eq("space_id", space.id);

  type Row = {
    status: string; marked_at: string | null;
    students: { name: string } | { name: string }[];
    sessions: { id: string; session_no: number | null; scheduled_at: string | null; classes: { title: string } | { title: string }[] | null }
      | { id: string; session_no: number | null; scheduled_at: string | null; classes: { title: string } | { title: string }[] | null }[];
  };
  const rows = (data ?? []) as Row[];
  if (!rows.length) return { session: "차시 없음", rows: [] };

  // 가장 늦은 차시 하나를 고른다
  const withSess = rows.map((r) => ({ r, s: one(r.sessions)! }));
  const latestId = withSess
    .slice()
    .sort((a, b) => (b.s.scheduled_at ?? "").localeCompare(a.s.scheduled_at ?? ""))[0].s.id;
  const picked = withSess.filter((x) => x.s.id === latestId);
  const s = picked[0].s;
  const at = s.scheduled_at ? new Date(s.scheduled_at) : null;

  return {
    session: `${one(s.classes)?.title ?? "수업"} · ${s.session_no}회차${at ? ` (${hhmm(s.scheduled_at)})` : ""}`,
    rows: picked
      .map(({ r }) => ({
        name: one(r.students)!.name,
        status: ATT_LABEL[r.status] ?? "예정",
        time: r.status === "undecided" ? "—" : hhmm(r.marked_at),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko")),
  };
}

/* ── 숙제 관리 : 가장 최근 과제 ───────────────── */

export async function getAdminHomework(space: SpaceDetail): Promise<{ title: string; due: string; rows: HwRow[] }> {
  if (useMock) return mockHomework(space.subject ?? "정규");
  if (!space.id) return { title: "과제 없음", due: "—", rows: [] };

  const { data } = await db()
    .from("assignments")
    .select("title, due_date, submissions(status, submitted_at, students!inner(name))")
    .eq("space_id", space.id)
    .order("due_date", { ascending: false })
    .limit(1);

  type Row = {
    title: string; due_date: string | null;
    submissions: { status: string; submitted_at: string | null; students: { name: string } | { name: string }[] }[];
  };
  const a = (data ?? [])[0] as Row | undefined;
  if (!a) return { title: "과제 없음", due: "—", rows: [] };

  const label: Record<string, HwRow["status"]> = {
    submitted: "제출", late: "지각", pending: "미제출", resubmit: "미제출",
  };

  return {
    title: a.title,
    due: a.due_date ?? "—",
    rows: (a.submissions ?? [])
      .map((s) => ({
        name: one(s.students)!.name,
        status: label[s.status] ?? "미제출",
        at: s.submitted_at ? `${s.submitted_at.slice(5, 10)} ${hhmm(s.submitted_at)}` : "—",
      }))
      .sort((x, y) => x.name.localeCompare(y.name, "ko")),
  };
}

/* ── 성적 : 최근 시험 3개를 열로 ──────────────── */

export async function getAdminGrades(space: SpaceDetail): Promise<{ columns: string[]; rows: GradeRow[] }> {
  if (useMock) return mockGrades(space.subject ?? "정규");
  if (!space.id) return { columns: [], rows: [] };

  const [people, examRes] = await Promise.all([
    roster(space.id),
    db().from("exams").select("id, title, max_score, exam_date, exam_results(student_id, score)")
      .eq("space_id", space.id).order("exam_date", { ascending: false }).limit(6),
  ]);

  type ExamRow = { id: string; title: string; max_score: number | null; exam_results: { student_id: string; score: number | null }[] };
  // 아직 채점 안 된 시험은 열로 세우지 않는다
  const exams = ((examRes.data ?? []) as ExamRow[])
    .filter((e) => (e.exam_results ?? []).some((r) => r.score != null))
    .slice(0, 3)
    .reverse();

  if (!exams.length) return { columns: [], rows: [] };

  const rows: GradeRow[] = people.map((p) => {
    const scores = exams.map((e) => {
      const r = (e.exam_results ?? []).find((x) => x.student_id === p.id);
      return r?.score == null ? 0 : Math.round((Number(r.score) / Number(e.max_score ?? 100)) * 100);
    });
    return { name: p.name, scores, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) };
  });

  return { columns: exams.map((e) => e.title), rows };
}

/* ── 계정 승인 ─────────────────────────────────
   승인 큐 테이블이 아직 없다. 목에서만 존재하던 화면이라 실 DB 에서는 빈 목록. */

export async function getAdminApprovals(space: SpaceDetail): Promise<ApprovalRow[]> {
  if (useMock) return mockApprovals();
  void space;
  return [];
}

export type { Student, AttendanceRow, HwRow, GradeRow, ApprovalRow };
