"use client";

import { useActionState, useState } from "react";
import { saveAnswerKey, type ActionState } from "@/lib/omr-actions";
import { parseAnswerKey } from "@/lib/omr-grade";
import { Button } from "@/components/ui/Button";
import { submitWithoutReset, inputCls, textareaCls, labelCls, Message } from "./fields";

const initial: ActionState = { ok: false, message: "" };

/**
 * 정답 입력은 한 줄 문자열로 받는다. 30문항을 칸 30개로 받으면 마우스질만 30번이다.
 * 입력하는 동안 아래 미리보기가 문항 수·만점을 바로 보여줘서, 한 칸 빠진 걸 저장 전에 잡는다.
 */
export function AnswerKeyForm({
  slug, examId, initialKey, initialPoints, initialDefaultPoints, initialChoiceCount, hasSubmissions,
}: {
  slug: string;
  examId: string;
  initialKey: string;
  initialPoints: string;
  initialDefaultPoints: number;
  initialChoiceCount: number;
  hasSubmissions: boolean;
}) {
  const [state, action, pending] = useActionState(saveAnswerKey.bind(null, slug, examId), initial);
  const [key, setKey] = useState(initialKey);
  const [points, setPoints] = useState(initialPoints);
  const [defaultPoints, setDefaultPoints] = useState(String(initialDefaultPoints));
  const [choiceCount, setChoiceCount] = useState(initialChoiceCount);

  const preview = key.trim()
    ? parseAnswerKey(key, points, Number(defaultPoints) || 0, ["1", "2", "3", "4", "5"].slice(0, choiceCount))
    : null;

  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-3">
      <div>
        <label htmlFor="key" className={labelCls}>정답</label>
        <textarea
          id="key" name="key" rows={3} value={key} onChange={(e) => setKey(e.target.value)}
          placeholder="31245 23154 …  (복수정답 2/4 · 전원정답 *)"
          className={textareaCls}
        />
        <p className="mt-1 text-[12px] text-grey-500">
          숫자를 이어 쓰면 한 글자가 한 문항이에요. 복수정답(2/4)이나 전원정답(*)이 있으면 띄어쓰기로 구분해 주세요.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="default_points" className={labelCls}>문항당 배점</label>
          <input
            id="default_points" name="default_points" type="number" min={0} step="any"
            value={defaultPoints} onChange={(e) => setDefaultPoints(e.target.value)} className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="choice_count" className={labelCls}>선지 수</label>
          <select
            id="choice_count" name="choice_count" value={choiceCount}
            onChange={(e) => setChoiceCount(Number(e.target.value))} className={inputCls}
          >
            <option value={5}>5지선다</option>
            <option value={4}>4지선다</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="points" className={labelCls}>문항별 배점 (다를 때만)</label>
        <input
          id="points" name="points" value={points} onChange={(e) => setPoints(e.target.value)}
          placeholder="2 2 3 3 4 …  비워두면 모두 문항당 배점" className={`${inputCls} font-mono`}
        />
      </div>

      <div className="rounded-md bg-panel px-3 py-2.5 text-[13px]">
        {!preview ? (
          <span className="text-grey-500">정답을 입력하면 문항 수와 만점이 여기 보여요</span>
        ) : preview.ok ? (
          <span className="text-grey-700">
            <b className="num text-grey-900">{preview.rows.length}</b>문항 · 만점{" "}
            <b className="num text-grey-900">{preview.rows.reduce((a, r) => a + r.points, 0)}</b>점
          </span>
        ) : (
          <span className="text-red-500">{preview.error}</span>
        )}
      </div>

      {hasSubmissions && (
        <p className="text-[12px] text-amber-500">이미 낸 답안이 있어요. 저장하면 새 정답으로 전부 다시 채점해요.</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="md" disabled={pending || !preview?.ok}>
          {pending ? "저장 중…" : "정답 저장"}
        </Button>
        <Message ok={state.ok} message={state.message} />
      </div>
    </form>
  );
}
