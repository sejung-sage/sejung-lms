"use client";

import { useActionState, useState } from "react";
import { studentSubmit, type ActionState } from "@/lib/omr-actions";
import { Button } from "@/components/ui/Button";
import { Message } from "./fields";

const initial: ActionState = { ok: false, message: "" };

/**
 * 학생 마킹 화면. 문항당 한 줄, 선지는 엄지로 누르기 좋은 원형 버튼.
 * 실제 값은 라디오(name=q{번호})라서 JS 가 늦게 떠도 폼 제출은 된다.
 */
export function StudentOmrSheet({
  slug, examId, questions,
}: {
  slug: string;
  examId: string;
  questions: { no: number; choices: string[] }[];
}) {
  const [state, action, pending] = useActionState(studentSubmit.bind(null, slug, examId), initial);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [confirming, setConfirming] = useState(false);

  const answered = questions.filter((q) => marks[q.no]).length;
  const blank = questions.length - answered;

  return (
    <form action={action} className="space-y-3">
      <div className="divide-y divide-grey-100 rounded-card border border-grey-200 bg-white">
        {questions.map((q) => (
          <fieldset key={q.no} className="flex items-center gap-3 px-4 py-2.5">
            <legend className="sr-only">{q.no}번</legend>
            <span className="num w-7 shrink-0 text-[14px] font-bold text-grey-700">{q.no}</span>
            <div className="flex flex-1 justify-between gap-1.5">
              {q.choices.map((c) => {
                const on = marks[q.no] === c;
                return (
                  <label
                    key={c}
                    className={`pressable flex size-10 cursor-pointer items-center justify-center rounded-full border-[1.5px] text-[15px] font-bold transition-colors ${
                      on ? "border-grey-900 bg-grey-900 text-white" : "border-grey-300 text-grey-500"
                    }`}
                  >
                    <input
                      type="radio" name={`q${q.no}`} value={c} checked={on} className="sr-only"
                      onChange={() => { setMarks((m) => ({ ...m, [q.no]: c })); setConfirming(false); }}
                    />
                    {c}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="sticky bottom-[72px] space-y-2 rounded-card border border-grey-200 bg-white p-3">
        <div className="flex items-center justify-between text-[13.5px]">
          <span className="text-grey-600">
            <b className="num text-grey-900">{answered}</b>/{questions.length} 마킹
          </span>
          {blank > 0 && <span className="text-amber-500">빈 문항 {blank}개</span>}
        </div>

        {/* 한 번 내면 못 고친다 — 그래서 확인을 한 번 더 받는다 */}
        {confirming ? (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" size="lg" onClick={() => setConfirming(false)}>
              다시 보기
            </Button>
            <Button type="submit" variant="primary" size="lg" disabled={pending}>
              {pending ? "제출 중…" : "제출 확정"}
            </Button>
          </div>
        ) : (
          <Button type="button" variant="primary" size="lg" fullWidth onClick={() => setConfirming(true)} disabled={!answered}>
            답안 제출
          </Button>
        )}
        {confirming && (
          <p className="text-center text-[12px] text-grey-500">제출하면 수정할 수 없어요{blank ? ` · 빈 문항은 오답 처리돼요` : ""}</p>
        )}
        <Message ok={state.ok} message={state.message} />
      </div>
    </form>
  );
}
