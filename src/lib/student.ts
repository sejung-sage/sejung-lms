import { createAdminClient } from "@/lib/supabase/admin";
import {
  mockStudentHome, mockStudentGrade,
  type StudentHome, type StudentGrade,
} from "@/lib/mock/student";
import type { SpaceDetail } from "@/lib/spaces";

/**
 * SA 학생앱 데이터 seam.
 *
 * ⚠ 아직 로그인이 없다. 그래서 "누구의 화면인가"를 세션에서 못 가져온다.
 *   임시로 공간의 활성 수강생 중 이름순 첫 명을 골라 보여준다.
 *   인증이 붙으면 resolveViewer() 만 auth.uid() 기준으로 갈아끼우면 된다.
 */
const useMock = process.env.USE_MOCK_DB === "true";

type Db = ReturnType<typeof createAdminClient>;
type Viewer = { id: string; name: string };

async function resolveViewer(db: Db, spaceId: string): Promise<Viewer | null> {
  const { data } = await db
    .from("enrollments")
    .select("students!inner(id, name)")
    .eq("space_id", spaceId)
    .eq("status", "active");

  const rows = (data ?? []).flatMap((r: { students: Viewer | Viewer[] }) =>
    Array.isArray(r.students) ? r.students : [r.students],
  );
  rows.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return rows[0] ?? null;
}

/** 상위 몇 %인가 — 나보다 높은 점수의 비율 */
function percentileOf(score: number, all: number[]): number {
  if (!all.length) return 0;
  const above = all.filter((s) => s > score).length;
  return Math.max(1, Math.round((above / all.length) * 100));
}

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** 시험 + 그 시험의 전체 점수를, 응시일 순으로 */
async function examHistory(db: Db, spaceId: string, studentId: string) {
  const { data } = await db
    .from("exams")
    .select("id, title, exam_type, max_score, exam_date, exam_results(student_id, score)")
    .eq("space_id", spaceId)
    .order("exam_date", { ascending: true });

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
    .filter((e) => e.score != null);
}

export async function getStudentHome(space: SpaceDetail): Promise<StudentHome | null> {
  if (useMock) return mockStudentHome(space);
  if (!space.id) return null;

  const db = createAdminClient();
  const viewer = await resolveViewer(db, space.id);
  if (!viewer) return null;

  const subject = space.subject ?? "정규";
  const now = Date.now();

  const [sessionRes, asgRes, todoRes, noticeRes, exams] = await Promise.all([
    db.from("sessions").select("session_no, title, scheduled_at, concept_tags, classes(title, description)")
      .eq("space_id", space.id).order("scheduled_at", { ascending: true }),
    db.from("assignments").select("id, title, description, due_date, submissions(student_id, status)")
      .eq("space_id", space.id).order("due_date", { ascending: false }).limit(6),
    db.from("todos").select("kind, title, due_at, state")
      .eq("space_id", space.id).eq("student_id", viewer.id).order("state", { ascending: true }).order("due_at", { ascending: true }).limit(6),
    db.from("notices").select("title, body, created_at")
      .eq("space_id", space.id).order("created_at", { ascending: false }).limit(1),
    examHistory(db, space.id, viewer.id),
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
  const asgs = ((asgRes.data ?? []) as AsgRow[]).slice(0, 3);
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
  const dueAsg = ((asgRes.data ?? []) as AsgRow[]).filter((a) => (a.due_date ?? "") <= today);
  const mineAll = dueAsg.map((a) => (a.submissions ?? []).find((s) => s.student_id === viewer.id));
  const doneN = mineAll.filter((s) => s?.status === "submitted" || s?.status === "late").length;
  const rate = dueAsg.length ? Math.round((doneN / dueAsg.length) * 100) : 100;
  const grade = rate >= 95 ? "A" : rate >= 85 ? "B" : rate >= 70 ? "C" : "D";

  const last = exams[exams.length - 1];
  const notice = one(noticeRes.data ?? null);

  return {
    studentName: viewer.name,
    thisWeek: {
      tag: "정규수업",
      title: `이번 주 진도 · ${cur?.concept_tags?.[0] ?? cur?.title ?? "핵심 개념 정리"}`,
      className: `${subject} ${cur?.session_no ?? 1}회차`,
      location: cls?.description ?? "세정학원 대치",
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

export async function getStudentGrade(space: SpaceDetail): Promise<StudentGrade | null> {
  if (useMock) return mockStudentGrade(space);
  if (!space.id) return null;

  const db = createAdminClient();
  const viewer = await resolveViewer(db, space.id);
  if (!viewer) return null;

  const [exams, asgRes] = await Promise.all([
    examHistory(db, space.id, viewer.id),
    db.from("assignments").select("id, title, due_date, submissions(student_id, status)").eq("space_id", space.id),
  ]);

  // 100점 환산 — 시험마다 만점이 다르면 추이 그래프가 거짓말을 한다
  const pct = (e: (typeof exams)[number]) => Math.round((e.score! / (e.max || 100)) * 100);

  const weekly = exams
    .slice(-2).reverse()
    .map((e) => ({ label: e.title, score: pct(e), percentile: percentileOf(e.score!, e.all) }));

  type AsgRow = { id: string; title: string; due_date: string | null; submissions: { student_id: string; status: string }[] };
  const today = new Date().toISOString().slice(0, 10);
  const asgs = ((asgRes.data ?? []) as AsgRow[]).filter((a) => (a.due_date ?? "") <= today);
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
