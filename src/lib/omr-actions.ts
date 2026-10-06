"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSpaceBySlug, type SpaceDetail } from "@/lib/spaces";
import { resolveViewer } from "@/lib/student";
import {
  omrAvailable, getExamInSpace, getQuestions, writeSheet, regradeExam, DEFAULT_CHOICES,
  type OmrExamMeta,
} from "@/lib/omr";
import { parseAnswerKey, parseKeypad } from "@/lib/omr-grade";

/**
 * 디지털 OMR 쓰기 액션.
 *
 * ⚠ 아직 로그인이 없다. 지금은 "slug 의 공간 안에 있는 시험·학생인가"까지만 확인한다.
 *   인증이 붙으면 각 액션 맨 앞에서 역할(조교 이상 / 본인 학생)을 확인해야 한다.
 */

export type ActionState = { ok: boolean; message: string; at?: number };

const fail = (message: string): ActionState => ({ ok: false, message, at: Date.now() });
const done = (message: string): ActionState => ({ ok: true, message, at: Date.now() });

type Scope =
  | { ok: false; error: string }
  | { ok: true; space: SpaceDetail; exam: OmrExamMeta | null };

async function scope(slug: string, examId?: string): Promise<Scope> {
  if (!omrAvailable) return { ok: false, error: "목 데이터 모드에서는 OMR 을 쓸 수 없어요" };
  const space = await getSpaceBySlug(slug);
  if (!space?.id) return { ok: false, error: "공간을 찾을 수 없어요" };
  if (!examId) return { ok: true, space, exam: null };
  const exam = await getExamInSpace(space.id, examId);
  if (!exam) return { ok: false, error: "이 공간의 시험이 아니에요" };
  return { ok: true, space, exam };
}

const adminPath = (slug: string, examId?: string) =>
  examId ? `/s/${slug}/admin/omr/${examId}` : `/s/${slug}/admin/omr`;

/* ── 시험 만들기 ─────────────────────────────── */

export async function createExam(slug: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const s = await scope(slug);
  if (!s.ok) return fail(s.error);

  const title = String(fd.get("title") ?? "").trim();
  const examDate = String(fd.get("exam_date") ?? "").trim() || null;
  const examType = String(fd.get("exam_type") ?? "").trim() || null;
  const cutoffRaw = String(fd.get("cutoff") ?? "").trim();
  const cutoff = cutoffRaw === "" ? null : Number(cutoffRaw);

  if (!title) return fail("시험 이름을 입력해 주세요");
  if (cutoff != null && (!Number.isFinite(cutoff) || cutoff < 0)) return fail("커트라인은 0 이상의 숫자여야 해요");

  const { data, error } = await createAdminClient()
    .from("exams")
    .insert({ space_id: s.space.id, title, exam_date: examDate, exam_type: examType, cutoff_score: cutoff })
    .select("id")
    .single();
  if (error || !data) return fail(`시험을 만들지 못했어요: ${error?.message ?? "알 수 없는 오류"}`);

  redirect(adminPath(slug, data.id));
}

/* ── 정답·배점 저장 (+ 이미 낸 답안 재채점) ─────────── */

export async function saveAnswerKey(
  slug: string, examId: string, _prev: ActionState, fd: FormData,
): Promise<ActionState> {
  const s = await scope(slug, examId);
  if (!s.ok) return fail(s.error);
  const exam = s.exam!;

  const choiceCount = Number(fd.get("choice_count") ?? 5);
  if (![4, 5].includes(choiceCount)) return fail("선지 수는 4 또는 5만 돼요");
  const choices = DEFAULT_CHOICES.slice(0, choiceCount);

  const defaultPoints = Number(fd.get("default_points") ?? 1);
  if (!Number.isFinite(defaultPoints) || defaultPoints < 0) return fail("기본 배점이 숫자가 아니에요");

  const parsed = parseAnswerKey(String(fd.get("key") ?? ""), String(fd.get("points") ?? ""), defaultPoints, choices);
  if (!parsed.ok) return fail(parsed.error);

  const client = createAdminClient();
  // question_no 기준 upsert — 기존 문항 id 를 살려야 학생들의 문항별 답안이 끊기지 않는다
  const { error } = await client.from("exam_questions").upsert(
    parsed.rows.map((r, i) => ({
      exam_id: exam.id,
      question_no: i + 1,
      points: r.points,
      correct_answers: r.correct,
      choices,
    })),
    { onConflict: "exam_id,question_no" },
  );
  if (error) return fail(`정답을 저장하지 못했어요: ${error.message}`);

  // 문항 수를 줄였으면 뒤쪽 문항을 지운다 (그 문항의 답안도 cascade 로 같이 지워진다)
  await client.from("exam_questions").delete().eq("exam_id", exam.id).gt("question_no", parsed.rows.length);

  const max = parsed.rows.reduce((a, r) => a + r.points, 0);
  await client.from("exams").update({ max_score: max }).eq("id", exam.id);

  const regraded = await regradeExam({ ...exam, maxScore: max });
  revalidatePath(adminPath(slug, examId));
  return done(
    `${parsed.rows.length}문항 · 만점 ${max}점으로 저장했어요` + (regraded ? ` · 제출된 답안 ${regraded}건 재채점` : ""),
  );
}

/* ── 학생 제출 받기 열기/닫기 ─────────────────────── */

export async function setOmrOpen(slug: string, examId: string, open: boolean): Promise<void> {
  const s = await scope(slug, examId);
  if (!s.ok) return;
  if (open) {
    // 정답이 없는 시험을 열면 학생이 내도 채점할 수 없다
    const qs = await getQuestions(examId);
    if (!qs.length) return;
  }
  await createAdminClient().from("exams").update({ omr_open: open }).eq("id", examId);
  revalidatePath(adminPath(slug, examId));
  revalidatePath(adminPath(slug));
}

/* ── 조교 대리 입력 ────────────────────────────── */

export async function staffSubmit(
  slug: string, examId: string, _prev: ActionState, fd: FormData,
): Promise<ActionState> {
  const s = await scope(slug, examId);
  if (!s.ok) return fail(s.error);
  const exam = s.exam!;

  const studentId = String(fd.get("student_id") ?? "");
  if (!studentId) return fail("학생을 골라 주세요");

  const { data: enr } = await createAdminClient()
    .from("enrollments")
    .select("students!inner(name)")
    .eq("space_id", s.space.id)
    .eq("student_id", studentId)
    .limit(1)
    .maybeSingle();
  if (!enr) return fail("이 공간 수강생이 아니에요");
  const st = (enr as { students: { name: string } | { name: string }[] }).students;
  const name = Array.isArray(st) ? st[0]?.name : st.name;

  const questions = await getQuestions(exam.id);
  if (!questions.length) return fail("정답을 먼저 등록해 주세요");

  const parsed = parseKeypad(String(fd.get("keypad") ?? ""), questions.length, (i) => questions[i]?.choices ?? []);
  if (!parsed.ok) return fail(parsed.error);

  try {
    const g = await writeSheet(exam, questions, studentId, parsed.marks, "staff");
    revalidatePath(adminPath(slug, examId));
    return done(`${name} ${g.score}/${g.max}점 저장`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "저장하지 못했어요");
  }
}

/* ── 학생 제출 ─────────────────────────────────── */

export async function studentSubmit(
  slug: string, examId: string, _prev: ActionState, fd: FormData,
): Promise<ActionState> {
  const s = await scope(slug, examId);
  if (!s.ok) return fail(s.error);
  const exam = s.exam!;
  if (!exam.omrOpen) return fail("지금은 답안 제출 시간이 아니에요");

  const client = createAdminClient();
  const viewer = await resolveViewer(client, s.space.id);
  if (!viewer) return fail("학생 정보를 찾을 수 없어요");

  // 학생은 한 번만 낸다. 고칠 일이 있으면 조교가 대리 입력으로 덮어쓴다.
  const { data: prior } = await client
    .from("exam_results")
    .select("score")
    .eq("exam_id", exam.id)
    .eq("student_id", viewer.id)
    .maybeSingle();
  if (prior?.score != null) return fail("이미 제출한 시험이에요");

  const questions = await getQuestions(exam.id, client);
  if (!questions.length) return fail("아직 채점 준비가 안 된 시험이에요");

  const marks = questions.map((q) => {
    const v = String(fd.get(`q${q.no}`) ?? "");
    return q.choices.includes(v) ? v : null;
  });

  try {
    await writeSheet(exam, questions, viewer.id, marks, "student");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "제출하지 못했어요");
  }
  revalidatePath(`/s/${slug}/student/omr/${examId}`);
  revalidatePath(`/s/${slug}/student/omr`);
  return done("제출했어요");
}
