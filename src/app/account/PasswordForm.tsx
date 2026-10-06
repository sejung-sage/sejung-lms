"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "./actions";
import { Button } from "@/components/ui/Button";
import { inputCls, labelCls, Message } from "@/components/omr/fields";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, { ok: false, message: "" });
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="password" className={labelCls}>새 비밀번호</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className={`${inputCls} h-12`} />
      </div>
      <div>
        <label htmlFor="password2" className={labelCls}>한 번 더</label>
        <input id="password2" name="password2" type="password" required minLength={8} autoComplete="new-password" className={`${inputCls} h-12`} />
      </div>
      <Message ok={state.ok} message={state.message} />
      <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
        {pending ? "바꾸는 중…" : "비밀번호 바꾸기"}
      </Button>
    </form>
  );
}
