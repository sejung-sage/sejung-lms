import { createAdminClient } from "@/lib/supabase/admin";
import {
  mockStudentHome, mockStudentGrade,
  type StudentHome, type StudentGrade,
} from "@/lib/mock/student";
import type { SpaceDetail } from "@/lib/spaces";

/**
 * SA 학생앱 데이터 seam.
 *
 * 누구의 화면인지는 lib/auth.ts 의 studentContext 가 정해서 넘겨준다
 * (학생 본인, 또는 운영진 미리보기면 첫 학생).
 */
const useMock = process.env.USE_MOCK_DB === "true";

type Db = ReturnType<typeof createAdminClient>;
type Viewer = { id: string; name: string };

/** 상위 몇 %인가 — 나보다 높은 점수의 비율 */
function percentileOf(score: number, all: number[]): number {
  if (!all.length) return 0;
  const above = all.filter((s) => s > score).length;
  return Math.max(1, Math.round((above / all.length) * 100));
}

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** 시험 + 그 시험의 전체 점수를, 응시일 순으로 */
async function examHistory(db: Db, spaceId: string, studentId: string, classId?: string) {
  let q = db
    .from("exams")
    .select("id, title, exam_type, max_score, exam_date, exam_results(student_id, score)")
    .eq("space_id", spaceId);
  if (classId) q = q.eq("class_id", classId);
  const { data } = await q.order("exam_date", { ascending: true });

  type Row = {
    id: string; title: string; exam_type: string | null; max_score: number | null; exam_date: string | null;
    exam_results: { student_id: string; score: number | null }[];
  };

  return ((data ?? []) as Row[])
    .map((e, i) => {
      const scores = (e.exam_results ?? []).filter((r) => r.score != null).map((r) => Number(r.score));
      const mine = (e.exam_results ?? []).find((r) => r.student_id === studentId);
      return {
        round: i + 1,
        title: e.title,
        type: e.exam_type,
        max: Number(e.max_score ?? 100),
        date: e.exam_date,
        score: mine?.score == null ? null : Number(mine.score),
        classAvg: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
        all: scores,
      };
    })
    .filter((e) => e.score != null)
    // 한 강사가 강좌를 여러 개 열면 공간 전체 시험 순번이 건너뛴다 — 내가 본 시험 기준으로 다시 센다
    .map((e, i) => ({ ...e, round: i + 1 }));
}

/** 내 숙제만 — 숙제는 그 강좌 수강생에게만 제출 행이 생긴다. 다른 반 숙제를 미제출로 세지 않는다 */
function mineOnly<T extends { submissions: { student_id: string }[] | null }>(rows: T[], studentId: string): T[] {
  return rows.filter((a) => (a.submissions ?? []).some((s) => s.student_id === studentId));
}

/** 강좌 하나의 학생 홈 — 이번 수업 · 숙제 · 테스트 · 할 일이 전부 이 강좌 것 */
export async function getStudentHome(space: SpaceDetail, viewer: Viewer, classId: string): Promise<StudentHome | null> {
  if (useMock) return mockStudentHome(space);
  if (!space.id) return null;

  const db = createAdminClient();

  const subject = space.subject ?? "정규";
  const now = Date.now();

  const [sessionRes, asgRes, todoRes, noticeRes, exams, clsRes] = await Promise.all([
    db.from("sessions").select("session_no, title, scheduled_at, concept_tags, classes(title, description)")
      .eq("space_id", space.id).eq("class_id", classId).order("scheduled_at", { ascending: true }),
    db.from("assignments").select("id, title, description, due_date, submissions(student_id, status)")
      .eq("space_id", space.id).eq("class_id", classId).order("due_date", { ascending: false }).limit(12),
    db.from("todos").select("kind, title, due_at, state")
      .eq("space_id", space.id).eq("class_id", classId).eq("student_id", viewer.id).order("state", { ascending: true }).order("due_at", { ascending: true }).limit(6),
    db.from("notices").select("title, body, created_at")
      .eq("space_id", space.id).order("created_at", { ascending: false }).limit(1),
    examHistory(db, space.id, viewer.id, classId),
    db.from("classes").select("kind, slots").eq("id", classId).maybeSingle(),
  ]);

  /* ── 이번 주 수업: 지금과 가장 가까운(아직 안 지난) 차시 ── */
  type SessRow = {
    session_no: number | null; title: string | null; scheduled_at: string | null;
    concept_tags: string[] | null; classes: { title: string; description: string | null } | { title: string; description: string | null }[] | null;
  };
  const sessions = ((sessionRes.data ?? []) as SessRow[]).filter((s) => s.scheduled_at);
  const cur =
    sessions.find((s) => new Date(s.scheduled_at!).getTime() >= now - 3 * 3600_000) ??
    sessions[sessions.length - 1];
  const cls = one(cur?.classes ?? null);
  const at = cur?.scheduled_at ? new Date(cur.scheduled_at) : null;
  const fmt = (d: Date) =>
    d.toLocaleString("ko-KR", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" });

  /* ── 숙제: 최근 3건 + 내 제출 상태 ── */
  type AsgRow = {
    id: string; title: string; description: string | null; due_date: string | null;
    submissions: { student_id: string; status: string }[];
  };
  const myAsg = mineOnly((asgRes.data ?? []) as AsgRow[], viewer.id);
  const asgs = myAsg.slice(0, 3);
  const homework = asgs.map((a) => {
    const mine = (a.submissions ?? []).find((s) => s.student_id === viewer.id);
    const done = mine?.status === "submitted" || mine?.status === "late";
    return {
      title: a.title,
      sub: done ? (mine!.status === "late" ? "지각 제출" : "제출 완료") : "제출 전",
      done,
    };
  });

  type TodoRow = { kind: string; title: string; due_at: string | null; state: string };
  const todoLabel: Record<string, string> = {
    retake: "재시험",
    online_submit: "온라인 제출",
    clinic_reserve: "클리닉 예약",
    assignment: "과제",
    survey: "설문",
    custom: "할 일",
  };
  const todos = ((todoRes.data ?? []) as TodoRow[]).map((t) => ({
    title: t.title,
    sub: `${todoLabel[t.kind] ?? "할 일"}${t.due_at ? ` · ${t.due_at.slice(5, 10)}까지` : ""}`,
    done: t.state !== "open",
  }));

  /* ── 과제 수행 등급 ──
     분모는 '마감이 지난 과제'만. 아직 마감 전인 과제를 미제출로 세면
     성실한 학생도 D등급으로 떨어진다. */
  const today = new Date().toISOString().slice(0, 10);
  const dueAsg = myAsg.filter((a) => (a.due_date ?? "") <= today);
  const mineAll = dueAsg.map((a) => (a.submissions ?? []).find((s) => s.student_id === viewer.id));
  const doneN = mineAll.filter((s) => s?.status === "submitted" || s?.status === "late").length;
  const rate = dueAsg.length ? Math.round((doneN / dueAsg.length) * 100) : 100;
  const grade = rate >= 95 ? "A" : rate >= 85 ? "B" : rate >= 70 ? "C" : "D";

  const last = exams[exams.length - 1];
  const notice = one(noticeRes.data ?? null);

  const slot = ((clsRes.data?.slots ?? []) as { room_name: string | null }[])[0];
  return {
    studentName: viewer.name,
    thisWeek: {
      tag: clsRes.data?.kind === "special" ? "특강" : "정규수업",
      title: `이번 주 진도 · ${cur?.concept_tags?.[0] ?? cur?.title ?? "핵심 개념 정리"}`,
      className: `${cls?.title ?? subject} ${cur?.session_no ?? 1}회차`,
      location: slot?.room_name ?? cls?.description ?? "세정학원 대치",
      week: `${cur?.session_no ?? 1}주차`,
      time: at ? fmt(at) : "일정 미정",
    },
    assignmentGrade: { grade, desc: `숙제 제출률 ${rate}%` },
    test: last
      ? {
          round: last.title,
          score: last.score!,
          max: last.max,
          percentile: percentileOf(last.score!, last.all),
          classAvg: last.classAvg,
        }
      : { round: "응시한 시험 없음", score: 0, max: 0, percentile: 0, classAvg: 0 },
    homework,
    todos: todos.length ? todos : homework,
    notice: notice
      ? {
          title: notice.title,
          body: notice.body ?? "",
          teacher: space.name,
          date: notice.created_at.slice(5, 10),
        }
      : { title: "등록된 공지가 없어요", body: "", teacher: space.name, date: "" },
  };
}

export async function getStudentGrade(space: SpaceDetail, viewer: Viewer, classId?: string): Promise<StudentGrade | null> {
  if (useMock) return mockStudentGrade(space);
  if (!space.id) return null;

  const db = createAdminClient();

  let asgQ = db.from("assignments").select("id, title, due_date, submissions(student_id, status)").eq("space_id", space.id);
  if (classId) asgQ = asgQ.eq("class_id", classId);
  const [exams, asgRes] = await Promise.all([
    examHistory(db, space.id, viewer.id, classId),
    asgQ,
  ]);

  // 100점 환산 — 시험마다 만점이 다르면 추이 그래프가 거짓말을 한다
  const pct = (e: (typeof exams)[number]) => Math.round((e.score! / (e.max || 100)) * 100);

  const weekly = exams
    .slice(-2).reverse()
    .map((e) => ({ label: e.title, score: pct(e), percentile: percentileOf(e.score!, e.all) }));

  type AsgRow = { id: string; title: string; due_date: string | null; submissions: { student_id: string; status: string }[] };
  const today = new Date().toISOString().slice(0, 10);
  const asgs = mineOnly((asgRes.data ?? []) as AsgRow[], viewer.id).filter((a) => (a.due_date ?? "") <= today);
  const mine = asgs.map((a) => ({
    title: a.title,
    s: (a.submissions ?? []).find((s) => s.student_id === viewer.id)?.status,
  }));
  const doneN = mine.filter((m) => m.s === "submitted" || m.s === "late").length;

  return {
    weekly,
    examTrend: {
      labels: exams.map((e) => `${e.round}회`),
      points: exams.map(pct),
    },
    progress: {
      percent: asgs.length ? Math.round((doneN / asgs.length) * 100) : 0,
      current: exams.length ? `${exams.length}회차까지 응시` : "응시 이력 없음",
      incomplete: mine.find((m) => m.s !== "submitted" && m.s !== "late")?.title ?? "없음",
    },
  };
}

export type { StudentHome, StudentGrade };

/* ── 학생: 이 강사에게서 듣는 강좌 목록 ──────────── */

export type StudentCourse = {
  id: string; title: string; kind: "regular" | "special";
  slots: { weekday: string; start_time: string; end_time: string; room_name: string | null }[];
  next: string | null; lastTest: { title: string; score: number; max: number } | null;
  homework: { done: number; total: number }; openTodos: number;
};

export async function getStudentCourses(space: SpaceDetail, viewer: Viewer): Promise<StudentCourse[]> {
  if (!space.id) return [];
  const db = createAdminClient();
  const { data: mem } = await db.from("class_members").select("class_id").eq("space_id", space.id).eq("student_id", viewer.id);
  const ids = (mem ?? []).map((m) => m.class_id);
  if (!ids.length) return [];
  const [clsRes, sesRes, examRes, asgRes, todoRes] = await Promise.all([
    db.from("classes").select("id, title, kind, slots, is_closed").in("id", ids).order("is_closed").order("title"),
    db.from("sessions").select("class_id, scheduled_at").in("class_id", ids).order("scheduled_at"),
    db.from("exams").select("class_id, title, max_score, exam_date, exam_results!inner(score, student_id)").in("class_id", ids).eq("exam_results.student_id", viewer.id).order("exam_date"),
    db.from("assignments").select("class_id, due_date, submissions!inner(status, student_id)").in("class_id", ids).eq("submissions.student_id", viewer.id),
    db.from("todos").select("class_id").in("class_id", ids).eq("student_id", viewer.id).eq("state", "open"),
  ]);
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  type E = { class_id: string; title: string; max_score: number | null; exam_results: { score: number | null }[] };
  type A = { class_id: string; due_date: string | null; submissions: { status: string }[] };
  return (clsRes.data ?? []).map((c) => {
    const next = (sesRes.data ?? []).find((x) => x.class_id === c.id && x.scheduled_at && new Date(x.scheduled_at).getTime() >= now - 3 * 3600_000);
    const tests = ((examRes.data ?? []) as E[]).filter((e) => e.class_id === c.id && e.exam_results?.[0]?.score != null);
    const t = tests[tests.length - 1];
    const asg = ((asgRes.data ?? []) as A[]).filter((a) => a.class_id === c.id && (a.due_date ?? "") <= today);
    return {
      id: c.id, title: c.title, kind: c.kind, slots: c.slots ?? [],
      next: next?.scheduled_at ?? null,
      lastTest: t ? { title: t.title, score: Number(t.exam_results[0].score), max: Number(t.max_score ?? 100) } : null,
      homework: { done: asg.filter((a) => ["submitted", "late"].includes(a.submissions?.[0]?.status)).length, total: asg.length },
      openTodos: (todoRes.data ?? []).filter((x) => x.class_id === c.id).length,
    };
  });
}

/** 학생 홈 아래 '오늘 할 일' — 이 강사 공간의 내 할 일 전부(강좌 이름과 함께) */
export async function getStudentTodos(space: SpaceDetail, viewer: Viewer) {
  if (!space.id) return [];
  const { data } = await createAdminClient().from("todos").select("kind, title, due_at, state, classes(title)")
    .eq("space_id", space.id).eq("student_id", viewer.id).eq("state", "open").order("due_at", { ascending: true }).limit(8);
  const label: Record<string, string> = { retake: "재시험", online_submit: "온라인 제출", clinic_reserve: "클리닉 예약", assignment: "과제", survey: "설문", custom: "할 일" };
  type R = { kind: string; title: string; due_at: string | null; classes: { title: string } | { title: string }[] | null };
  return ((data ?? []) as R[]).map((t) => ({
    title: t.title,
    sub: `${label[t.kind] ?? "할 일"}${t.due_at ? ` · ${t.due_at.slice(5, 10)}까지` : ""}`,
    course: one(t.classes)?.title ?? null,
  }));
}
