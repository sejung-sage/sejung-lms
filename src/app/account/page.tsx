import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { ButtonLink } from "@/components/ui/Button";
import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "내 계정 · 세정학원" };

const ROLE: Record<string, string> = {
  admin: "학원 관리자", teacher: "선생님", assistant: "조교", student: "학생", parent: "학부모",
};

export default async function AccountPage() {
  // requireLogin 을 쓰면 '비번 변경 필요' 때문에 여기로 다시 돌아오는 순환이 생긴다
  const v = await getViewer();
  if (!v) redirect("/login?next=/account");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-panel px-5 py-10">
      <section className="w-full max-w-[400px] rounded-card border border-grey-200 bg-white p-7">
        <div className="mb-5">
          <div className="text-[13px] font-semibold text-blue-500">{ROLE[v.role] ?? v.role}</div>
          <h1 className="mt-1 text-[22px] font-bold tracking-[-0.03em] text-grey-900">{v.name || "내 계정"}</h1>
          {v.loginId && <div className="num mt-0.5 text-[13px] text-grey-500">아이디 {v.loginId}</div>}
        </div>

        {v.mustChangePassword && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2.5 text-[13px] text-amber-500">
            학원에서 받은 임시 비밀번호예요. 쓰기 전에 새 비밀번호로 바꿔 주세요.
          </p>
        )}

        <PasswordForm />

        <div className="mt-6 flex items-center justify-between border-t border-grey-100 pt-4">
          {v.mustChangePassword ? <span /> : <ButtonLink href="/" variant="ghost" size="sm">처음으로</ButtonLink>}
          <form action={signOut}>
            <button type="submit" className="text-[13px] font-semibold text-grey-500 hover:text-red-500">로그아웃</button>
          </form>
        </div>
      </section>
    </main>
  );
}
