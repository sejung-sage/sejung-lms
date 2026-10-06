/**
 * 디지털 OMR 채점 — 순수 함수만 둔다.
 *
 * 서버(제출 처리·재채점)와 클라이언트(조교 키패드 미리보기)가 같은 규칙을 써야
 * "화면에선 맞았는데 저장하니 틀림" 같은 일이 안 생긴다. 그래서 DB 를 모르는 이 파일에 모은다.
 */

/** 문항 오류 등으로 전원 정답 처리할 때 정답 칸에 넣는 표시 */
export const ALL_CORRECT = "*";

export type GradeQuestion = {
  id: string;
  no: number;
  points: number;
  correct: string[];
  exception: string[];
};

export type GradedAnswer = {
  questionId: string;
  answer: string | null;
  isCorrect: boolean;
  earned: number;
};

export function isCorrect(q: GradeQuestion, answer: string | null): boolean {
  if (q.correct.includes(ALL_CORRECT)) return true;
  if (answer == null) return false;
  return q.correct.includes(answer) || q.exception.includes(answer);
}

export function gradeSheet(questions: GradeQuestion[], marks: (string | null)[]) {
  const answers: GradedAnswer[] = questions.map((q, i) => {
    const answer = marks[i] ?? null;
    const ok = isCorrect(q, answer);
    return { questionId: q.id, answer, isCorrect: ok, earned: ok ? q.points : 0 };
  });
  return {
    answers,
    score: answers.reduce((s, a) => s + a.earned, 0),
    max: questions.reduce((s, q) => s + q.points, 0),
  };
}

/** 미응답으로 읽는 글자 — 키패드에서 0 을 누르거나 - 로 건너뛴다 */
const BLANK = new Set(["0", "-", ".", "_"]);

/**
 * 조교 키패드 입력: "31245-2…" 처럼 문항 순서대로 한 글자씩.
 * 공백·쉼표는 눈으로 끊어 읽으라고 허용하고 무시한다.
 * 길이가 문항 수와 다르면 받지 않는다 — 한 칸 밀리면 그 뒤가 전부 틀리기 때문.
 */
export function parseKeypad(
  raw: string,
  count: number,
  choicesOf: (index: number) => string[],
): { ok: true; marks: (string | null)[] } | { ok: false; error: string; marks: (string | null)[] } {
  const chars = [...raw.replace(/[\s,]/g, "")];
  const marks = chars.map((c) => (BLANK.has(c) ? null : c));

  const bad = marks.findIndex((m, i) => m != null && !choicesOf(i).includes(m));
  if (bad >= 0) {
    return { ok: false, error: `${bad + 1}번에 없는 선지(${marks[bad]})가 들어갔어요`, marks };
  }
  if (marks.length !== count) {
    return { ok: false, error: `${count}문항인데 ${marks.length}개가 입력됐어요`, marks };
  }
  return { ok: true, marks };
}

/**
 * 정답·배점 입력 칸 토큰화.
 * 띄어쓰기/쉼표로 끊으면 토큰 단위, 끊지 않은 숫자열이면 한 글자씩.
 * 예) "3 1 2/4 5"  →  ["3","1","2/4","5"]   ·   "31245" → ["3","1","2","4","5"]
 */
export function tokenize(raw: string): string[] {
  const s = raw.trim();
  if (!s) return [];
  if (/[\s,]/.test(s)) return s.split(/[\s,]+/).filter(Boolean);
  // "2.5" 처럼 소수점이 있으면 한 글자씩 자르면 안 된다 — 한 문항짜리 배점으로 본다
  if (s.includes(".")) return [s];
  return [...s];
}

export type KeyRow = { correct: string[]; points: number };

/**
 * 정답 + 배점 입력을 문항별로 묶는다.
 *  - 정답 토큰의 "/" 는 복수정답, "*" 는 전원 정답
 *  - 배점 칸이 비어 있으면 모든 문항에 기본 배점
 */
export function parseAnswerKey(
  keyRaw: string,
  pointsRaw: string,
  defaultPoints: number,
  choices: string[],
): { ok: true; rows: KeyRow[] } | { ok: false; error: string } {
  // 선지는 한 자리라서 "31245 23154" 처럼 다섯 개씩 끊어 써도 숫자열은 한 글자씩 푼다
  const keys = tokenize(keyRaw).flatMap((t) => (/^\d+$/.test(t) ? [...t] : [t]));
  if (!keys.length) return { ok: false, error: "정답을 입력해 주세요" };
  if (keys.length > 100) return { ok: false, error: "문항은 100개까지 받을 수 있어요" };

  const rows: KeyRow[] = [];
  for (const [i, k] of keys.entries()) {
    const correct = k === ALL_CORRECT ? [ALL_CORRECT] : k.split("/").filter(Boolean);
    const bad = correct.find((c) => c !== ALL_CORRECT && !choices.includes(c));
    if (!correct.length || bad) {
      return { ok: false, error: `${i + 1}번 정답 '${k}'을(를) 읽을 수 없어요 (선지 ${choices.join("·")})` };
    }
    rows.push({ correct, points: defaultPoints });
  }

  const pts = tokenize(pointsRaw);
  if (pts.length) {
    if (pts.length !== rows.length) {
      return { ok: false, error: `정답은 ${rows.length}개, 배점은 ${pts.length}개예요. 개수를 맞춰 주세요` };
    }
    for (const [i, p] of pts.entries()) {
      const n = Number(p);
      if (!Number.isFinite(n) || n < 0) return { ok: false, error: `${i + 1}번 배점 '${p}'이 숫자가 아니에요` };
      rows[i].points = n;
    }
  }
  return { ok: true, rows };
}
