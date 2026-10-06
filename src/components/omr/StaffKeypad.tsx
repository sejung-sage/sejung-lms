"use client";

import { useActionState, useRef, useState } from "react";
import { staffSubmit, type ActionState } from "@/lib/omr-actions";
import { parseKeypad, isCorrect, type GradeQuestion } from "@/lib/omr-grade";
import { Button } from "@/components/ui/Button";
import { submitWithoutReset, inputCls, labelCls, Message } from "./fields";

const initial: ActionState = { ok: false, message: "" };

export type KeypadQuestion = GradeQuestion & { choices: string[] };
export type KeypadStudent = { studentId: string; name: string; submitted: boolean };

/**
 * 조교 대리 입력.
 *
 * 종이 답안지를 옆에 두고 숫자만 연달아 친 뒤 Enter. 저장되면 입력칸이 비워지고
 * 아직 안 낸 다음 학생으로 넘어간다 — 손이 키보드를 떠나지 않게.
 */
export function StaffKeypad({
  slug, examId, questions, students,
}: {
  slug: string;
  examId: string;
  questions: KeypadQuestion[];
  students: KeypadStudent[];
}) {
  const firstOpen = students.find((s) => !s.submitted)?.studentId ?? students[0]?.studentId ?? "";
  const [studentId, setStudentId] = useState(firstOpen);
  const [raw, setRaw] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 저장 성공 → 비우고 다음 미제출 학생으로. 액션 안에서 처리해야 응답과 화면 전환이 한 번에 일어난다.
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const res = await staffSubmit(slug, examId, prev, fd);
    if (res.ok) {
      const savedId = String(fd.get("student_id") ?? "");
      const idx = students.findIndex((s) => s.studentId === savedId);
      const next =
        students.slice(idx + 1).find((s) => !s.submitted) ??
        students.find((s) => !s.submitted && s.studentId !== savedId);
      setRaw("");
      if (next) setStudentId(next.studentId);
      inputRef.current?.focus();
    }
    return res;
  }, initial);

  const parsed = parseKeypad(raw, questions.length, (i) => questions[i]?.choices ?? []);
  const marks = parsed.marks;
  const current = students.find((s) => s.studentId === studentId);
  const liveScore = questions.reduce((a, q, i) => a + (i < marks.length && isCorrect(q, marks[i]) ? q.points : 0), 0);

  if (!questions.length) {
    return <p className="text-[13.5px] text-grey-500">정답을 먼저 등록하면 대리 입력을 할 수 있어요.</p>;
  }

  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-3">
      <div>
        <label htmlFor="student_id" className={labelCls}>학생</label>
        <select
          id="student_id" name="student_id" value={studentId}
          onChange={(e) => { setStudentId(e.target.value); inputRef.current?.focus(); }}
          className={inputCls}
        >
          {students.map((s) => (
            <option key={s.studentId} value={s.studentId}>
              {s.name}{s.submitted ? " · 입력됨" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="keypad" className={labelCls}>
          답안 <span className="font-normal text-grey-500">· 0 또는 - 는 미응답</span>
        </label>
        <input
          ref={inputRef} id="keypad" name="keypad" value={raw} onChange={(e) => setRaw(e.target.value)}
          inputMode="numeric" autoComplete="off" autoFocus
          placeholder={`${questions.length}자리 숫자`}
          className={`${inputCls} h-12 font-mono text-[18px] tracking-[0.15em]`}
        />
      </div>

      {/* 친 답을 문항 번호 위에 펼쳐 보여준다 — 한 칸 밀림을 눈으로 바로 잡게 */}
      <div className="grid grid-cols-10 gap-1">
        {questions.map((q, i) => {
          const m = i < marks.length ? marks[i] : undefined;
          const tone =
            m === undefined ? "bg-grey-50 text-grey-300"
            : isCorrect(q, m) ? "bg-blue-100 text-blue-600"
            : "bg-red-50 text-red-500";
          return (
            <div key={q.id} className={`rounded-xs py-1 text-center ${tone}`}>
              <div className="text-[10px] leading-none opacity-70">{q.no}</div>
              <div className="num text-[14px] font-bold leading-tight">{m === undefined ? "·" : (m ?? "–")}</div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className={parsed.ok ? "text-grey-600" : "text-grey-500"}>
          <b className="num text-grey-900">{marks.length}</b>/{questions.length} 입력 · 현재{" "}
          <b className="num text-grey-900">{liveScore}</b>점
        </span>
        {!parsed.ok && raw && <span className="text-red-500">{parsed.error}</span>}
      </div>

      {current?.submitted && (
        <p className="text-[12px] text-amber-500">{current.name} 학생은 이미 점수가 있어요. 저장하면 덮어써요.</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="md" disabled={pending || !parsed.ok}>
          {pending ? "저장 중…" : "저장 (Enter)"}
        </Button>
        <Message ok={state.ok} message={state.message} />
      </div>
    </form>
  );
}
