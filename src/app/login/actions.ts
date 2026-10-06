"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginEmail, safeNextPath } from "@/lib/auth";

export type LoginState = { error: string };

export async function signIn(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const id = String(fd.get("id") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!id || !password) return { error: "아이디와 비밀번호를 입력해 주세요" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail(id), password });
  // 어느 쪽이 틀렸는지 알려주지 않는다 — 있는 아이디를 찔러보는 걸 막기 위해
  if (error) return { error: "아이디 또는 비밀번호가 맞지 않아요" };

  // 학원이 발급한 임시 비밀번호면 먼저 바꾸게 한다
  if (data.user.user_metadata?.must_change_password === true) redirect("/account?first=1");
  redirect(safeNextPath(fd.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
