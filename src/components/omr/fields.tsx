/** OMR 화면 공용 입력 스타일 — 매직링크 화면의 입력과 같은 규칙 */
import { startTransition } from "react";

export const inputCls =
  "h-10 w-full rounded-md border border-grey-200 bg-white px-3 text-[14px] text-grey-900 outline-none transition-colors placeholder:text-grey-400 focus:border-blue-500";

export const textareaCls =
  "w-full resize-none rounded-md border border-grey-200 bg-white px-3 py-2.5 font-mono text-[14px] leading-[1.6] text-grey-900 outline-none transition-colors placeholder:text-grey-400 focus:border-blue-500";

export const labelCls = "mb-1.5 block text-[13px] font-semibold text-grey-700";

export function Message({ ok, message }: { ok: boolean; message: string }) {
  if (!message) return null;
  return (
    <p aria-live="polite" className={`text-[13px] font-medium ${ok ? "text-green-500" : "text-red-500"}`}>
      {message}
    </p>
  );
}

/**
 * React 19 는 form action 이 끝나면 폼을 reset 한다. 제어 컴포넌트(select·textarea)는
 * state 는 그대로인데 DOM 만 초기값으로 돌아가서, 화면과 다음 제출값이 어긋난다
 * (대리 입력에서 다음 학생으로 넘겼는데 첫 학생으로 저장되는 식).
 * 그래서 action 속성 대신 onSubmit 에서 직접 액션을 부른다.
 */
export function submitWithoutReset(action: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}
