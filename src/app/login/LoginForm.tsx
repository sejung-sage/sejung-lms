"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";
import { inputCls, labelCls } from "@/components/omr/fields";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { error: "" });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="id" className={labelCls}>아이디</label>
        <input
          id="id" name="id" required autoComplete="username" autoCapitalize="none" autoFocus
          placeholder="학원에서 받은 아이디 · 선생님은 이메일" className={`${inputCls} h-12 text-[15px]`}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelCls}>비밀번호</label>
        <input
          id="password" name="password" type="password" required autoComplete="current-password"
          className={`${inputCls} h-12 text-[15px]`}
        />
      </div>
      {state.error && <p aria-live="polite" className="text-[13px] font-medium text-red-500">{state.error}</p>}
      <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
        {pending ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
