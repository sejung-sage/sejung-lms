"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

export type PasswordState = { ok: boolean; message: string };

export async function changePassword(_prev: PasswordState, fd: FormData): Promise<PasswordState> {
  const v = await getViewer();
  if (!v) redirect("/login");

  const next = String(fd.get("password") ?? "");
  const again = String(fd.get("password2") ?? "");
  if (next.length < 8) return { ok: false, message: "8자 이상으로 정해 주세요" };
  if (next !== again) return { ok: false, message: "두 번 입력한 비밀번호가 달라요" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next, data: { must_change_password: false } });
  if (error) {
    return { ok: false, message: error.message.includes("different") ? "지금과 다른 비밀번호로 정해 주세요" : "바꾸지 못했어요. 다시 시도해 주세요" };
  }
  if (v.mustChangePassword) redirect("/");
  return { ok: true, message: "비밀번호를 바꿨어요" };
}
