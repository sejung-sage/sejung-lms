import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeSheet, type GradeQuestion } from "@/lib/omr-grade";
import type { SpaceDetail } from "@/lib/spaces";

/**
 * 디지털 OMR 데이터 seam.
 *
 * 쓰기 경로는 하나다: writeSheet() → exam_answers(문항별) + exam_results(합계).
 * 평균·등수·재시험·할 일은 exam_results 트리거가 만든다. 여기서 다시 계산하지 않는다.
 *
 * 목 모드에는 OMR 이 없다. 문항·답안 테이블이 실 DB 에만 있어서 지어낼 수 없기 때문.
 */
export const omrAvailable = process.env.USE_MOCK_DB !== "true";

const db = () => createAdminClient();
type Db = ReturnType<typeof createAdminClient>;

export type OmrSource = "student" | "staff" | "scan";

/** exam_results.omr_data 에 남기는 원본 — 누가 언제 어떤 답을 냈는가 */
export type OmrData = {
  source: OmrSource;
  marks: (string | null)[];
  submitted_at: string;
};

export type OmrQuestion = GradeQuestion & { choices: string[] };

export type OmrExamMeta = {
  id: string;
  spaceId: string;
  title: string;
  examType: string | null;
  examDate: string | null;
  maxScore: number | null;
  cutoff: number | null;
  omrOpen: boolean;
  scoreOpen: boolean;
  stats: { count?: number; avg?: number; stddev?: number; max?: number };
};

const EXAM_COLS =
  "id, space_id, title, exam_type, exam_date, max_score, cutoff_score, omr_open, score_status, stats";

type ExamRow = {
  id: string; space_id: string; title: string; exam_type: string | null; exam_date: string | null;
  max_score: number | null; cutoff_score: number | null; omr_open: boolean; score_status: string;
  stats: OmrExamMeta["stats"] | null;
};

const toMeta = (e: ExamRow): OmrExamMeta => ({
  id: e.id,
  spaceId: e.space_id,
  title: e.title,
  examType: e.exam_type,
  examDate: e.exam_date,
  maxScore: e.max_score == null ? null : Number(e.max_score),
  cutoff: e.cutoff_score == null ? null : Number(e.cutoff_score),
  omrOpen: e.omr_open,
  scoreOpen: e.score_status === "open",
  stats: e.stats ?? {},
});

/** 시험을 공간 범위 안에서만 찾는다 — 다른 쌤 공간의 시험 id 를 넣어도 안 열린다 */
export async function getExamInSpace(spaceId: string, examId: string): Promise<OmrExamMeta | null> {
  const { data } = await db().from("exams").select(EXAM_COLS).eq("id", examId).eq("space_id", spaceId).maybeSingle();
  return data ? toMeta(data as ExamRow) : null;
}

export async function getQuestions(examId: string, client: Db = db()): Promise<OmrQuestion[]> {
  const { data } = await client
    .from("exam_questions")
    .select("id, question_no, points, correct_answers, exception_answers, choices")
    .eq("exam_id", examId)
    .order("question_no", { ascending: true });

  type Row = {
    id: string; question_no: number; points: number;
    correct_answers: string[]; exception_answers: string[]; choices: string[];
  };
  return ((data ?? []) as Row[]).map((q) => ({
    id: q.id,
    no: q.question_no,
    points: Number(q.points),
    correct: q.correct_answers ?? [],
    exception: q.exception_answers ?? [],
    choices: q.choices?.length ? q.choices : DEFAULT_CHOICES,
  }));
}

export const DEFAULT_CHOICES = ["1", "2", "3", "4", "5"];

type RosterRow = { id: string; name: string; school: string | null };

/** 이 공간에 지금 다니는 학생 — 대리 입력 대상 */
async function activeRoster(spaceId: string): Promise<RosterRow[]> {
  const { data } = await db()
    .from("enrollments")
    .select("students!inner(id, name, school)")
    .eq("space_id", spaceId)
    .eq("status", "active");
  const rows = (data ?? []).flatMap((r: { students: RosterRow | RosterRow[] }) =>
    Array.isArray(r.students) ? r.students : [r.students],
  );
  // 같은 학생이 반 두 개에 걸쳐 있으면 한 번만
  const seen = new Set<string>();
  return rows
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/* ── 관리자: 시험 목록 ───────────────────────────── */

export type OmrExamListRow = OmrExamMeta & { questionCount: number; submitted: number; roster: number };

export async function getOmrExamList(space: SpaceDetail): Promise<OmrExamListRow[]> {
  if (!omrAvailable || !space.id) return [];

  const [examRes, roster] = await Promise.all([
    db()
      .from("exams")
      .select(`${EXAM_COLS}, exam_questions(count), exam_results(score)`)
      .eq("space_id", space.id)
      .order("exam_date", { ascending: false, nullsFirst: true })
      .limit(60),
    activeRoster(space.id),
  ]);

  type Row = ExamRow & { exam_questions: { count: number }[]; exam_results: { score: number | null }[] };
  return ((examRes.data ?? []) as Row[]).map((e) => ({
    ...toMeta(e),
    questionCount: e.exam_questions?.[0]?.count ?? 0,
    submitted: (e.exam_results ?? []).filter((r) => r.score != null).length,
    roster: roster.length,
  }));
}

/* ── 관리자: 시험 하나 (정답 + 학생별 제출 현황) ─────── */

export type OmrSubmission = {
  studentId: string;
  name: string;
  school: string | null;
  score: number | null;
  source: OmrSource | "import" | null;
  submittedAt: string | null;
  marks: (string | null)[] | null;
};

export async function getOmrExamDetail(space: SpaceDetail, examId: string) {
  if (!omrAvailable || !space.id) return null;
  const exam = await getExamInSpace(space.id, examId);
  if (!exam) return null;

  const [questions, roster, resultRes] = await Promise.all([
    getQuestions(examId),
    activeRoster(space.id),
    db().from("exam_results").select("student_id, score, omr_data, graded_at").eq("exam_id", examId),
  ]);

  type Res = { student_id: string; score: number | null; omr_data: OmrData | null; graded_at: string | null };
  const byStudent = new Map(((resultRes.data ?? []) as Res[]).map((r) => [r.student_id, r]));

  const submissions: OmrSubmission[] = roster.map((p) => {
    const r = byStudent.get(p.id);
    const omr = r?.omr_data ?? null;
    return {
      studentId: p.id,
      name: p.name,
      school: p.school,
      score: r?.score == null ? null : Number(r.score),
      // OMR 이전에 엑셀·시드로 들어온 점수는 원본 답이 없다
      source: r?.score == null ? null : (omr?.source ?? "import"),
      submittedAt: omr?.submitted_at ?? r?.graded_at ?? null,
      marks: omr?.marks ?? null,
    };
  });

  return { exam, questions, submissions };
}

/* ── 학생: 지금 낼 수 있는 시험 ─────────────────── */

export type StudentOmrRow = {
  id: string;
  title: string;
  examDate: string | null;
  questionCount: number;
  submittedAt: string | null;
};

export async function getStudentOmrList(space: SpaceDetail, viewer: { id: string; name: string }) {
  if (!omrAvailable || !space.id) return null;
  const client = db();

  const { data } = await client
    .from("exams")
    .select("id, title, exam_date, exam_questions(count), exam_results(student_id, score, omr_data)")
    .eq("space_id", space.id)
    .eq("omr_open", true)
    .order("exam_date", { ascending: false });

  type Row = {
    id: string; title: string; exam_date: string | null;
    exam_questions: { count: number }[];
    exam_results: { student_id: string; score: number | null; omr_data: OmrData | null }[];
  };
  const rows: StudentOmrRow[] = ((data ?? []) as Row[])
    .map((e) => {
      const mine = (e.exam_results ?? []).find((r) => r.student_id === viewer.id && r.score != null);
      return {
        id: e.id,
        title: e.title,
        examDate: e.exam_date,
        questionCount: e.exam_questions?.[0]?.count ?? 0,
        submittedAt: mine ? (mine.omr_data?.submitted_at ?? "제출됨") : null,
      };
    })
    // 정답이 아직 없는 시험은 채점할 수 없으니 학생에게 보이지 않는다
    .filter((e) => e.questionCount > 0);

  return { viewer, rows };
}

export async function getStudentOmrSheet(space: SpaceDetail, examId: string, viewer: { id: string; name: string }) {
  if (!omrAvailable || !space.id) return null;
  const client = db();
  const exam = await getExamInSpace(space.id, examId);
  if (!exam) return null;

  const [questions, resultRes] = await Promise.all([
    getQuestions(examId, client),
    client.from("exam_results").select("score, omr_data").eq("exam_id", examId).eq("student_id", viewer.id).maybeSingle(),
  ]);
  const r = resultRes.data as { score: number | null; omr_data: OmrData | null } | null;

  return {
    viewer,
    exam,
    // 학생 화면으로 정답을 내려보내지 않는다 — 선지와 문항 번호만
    questions: questions.map((q) => ({ no: q.no, choices: q.choices })),
    submitted: r?.score == null ? null : { score: Number(r.score), marks: r.omr_data?.marks ?? null },
  };
}

/* ── 쓰기 ─────────────────────────────────────── */

/**
 * 한 학생의 답안을 채점해서 저장한다.
 * 문항별 행을 먼저 쓰고 합계를 나중에 쓴다 — 합계 쓰기가 트리거(통계·재시험)를 깨우므로,
 * 그 시점엔 문항별 데이터가 이미 있어야 한다.
 */
export async function writeSheet(
  exam: OmrExamMeta,
  questions: OmrQuestion[],
  studentId: string,
  marks: (string | null)[],
  source: OmrSource,
  /** 재채점일 때 원래 제출 시각을 지킨다 */
  submittedAt?: string,
) {
  const client = db();
  const now = new Date().toISOString();
  const graded = gradeSheet(questions, marks);

  const { error: ansErr } = await client.from("exam_answers").upsert(
    graded.answers.map((a) => ({
      exam_id: exam.id,
      question_id: a.questionId,
      student_id: studentId,
      answer: a.answer,
      is_correct: a.isCorrect,
      earned_points: a.earned,
      graded_at: now,
      updated_at: now,
    })),
    { onConflict: "question_id,student_id" },
  );
  if (ansErr) throw new Error(`문항별 답안 저장 실패: ${ansErr.message}`);

  const omr: OmrData = { source, marks, submitted_at: submittedAt ?? now };
  const { error: resErr } = await client.from("exam_results").upsert(
    {
      exam_id: exam.id,
      student_id: studentId,
      score: graded.score,
      omr_data: omr,
      channel: source === "student" ? "online" : "field",
      graded_at: now,
      updated_at: now,
    },
    { onConflict: "exam_id,student_id" },
  );
  if (resErr) throw new Error(`점수 저장 실패: ${resErr.message}`);

  return graded;
}

/**
 * 정답을 고친 뒤 이미 낸 답안을 다시 채점한다.
 * 원본 답(omr_data.marks)이 있는 학생만 — 엑셀로 들어온 점수는 답이 없어서 손댈 수 없다.
 */
export async function regradeExam(exam: OmrExamMeta): Promise<number> {
  const client = db();
  const [questions, resultRes] = await Promise.all([
    getQuestions(exam.id, client),
    client.from("exam_results").select("student_id, omr_data").eq("exam_id", exam.id).not("omr_data", "is", null),
  ]);

  type Res = { student_id: string; omr_data: OmrData };
  const rows = ((resultRes.data ?? []) as Res[]).filter((r) => Array.isArray(r.omr_data?.marks));
  for (const r of rows) {
    // 문항 수가 바뀌었으면 남는 칸은 미응답, 넘치는 칸은 버린다
    const marks = questions.map((_, i) => r.omr_data.marks[i] ?? null);
    await writeSheet(exam, questions, r.student_id, marks, r.omr_data.source, r.omr_data.submitted_at);
  }
  return rows.length;
}
