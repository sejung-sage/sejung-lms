"use client";

import { useActionState } from "react";
import { createExam, type ActionState } from "@/lib/omr-actions";
import { Button } from "@/components/ui/Button";
import { inputCls, labelCls, Message } from "./fields";

const initial: ActionState = { ok: false, message: "" };

/** 새 시험 — 만들면 곧바로 그 시험의 정답 입력 화면으로 이동한다 */
export function CreateExamForm({ slug, classId, today }: { slug: string; classId: string; today: string }) {
  const [state, action, pending] = useActionState(createExam.bind(null, slug, classId), initial);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
      <div>
        <label htmlFor="title" className={labelCls}>시험 이름</label>
        <input id="title" name="title" required placeholder="예) 9회차 주간테스트" className={inputCls} />
      </div>
      <div>
        <label htmlFor="exam_date" className={labelCls}>시험일</label>
        <input id="exam_date" name="exam_date" type="date" defaultValue={today} className={inputCls} />
      </div>
      <div>
        <label htmlFor="exam_type" className={labelCls}>유형</label>
        <input id="exam_type" name="exam_type" placeholder="주간테스트" className={inputCls} />
      </div>
      <div>
        <label htmlFor="cutoff" className={labelCls}>커트라인(점)</label>
        <input id="cutoff" name="cutoff" type="number" min={0} step="any" placeholder="공간 기본값" className={inputCls} />
      </div>
      <Button type="submit" variant="primary" size="md" disabled={pending}>
        {pending ? "만드는 중…" : "만들고 정답 입력"}
      </Button>
      <div className="sm:col-span-5">
        <Message ok={state.ok} message={state.message} />
      </div>
    </form>
  );
}
