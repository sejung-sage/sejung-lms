import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer, safeNextPath } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "로그인 · 세정학원" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await getViewer()) redirect(safeNextPath(next));

  return (
    <main className="flex min-h-dvh items-center justify-center bg-panel px-5 py-10">
      <section className="w-full max-w-[400px] rounded-card border border-grey-200 bg-white p-7">
        <div className="mb-6">
          <div className="text-[13px] font-semibold text-blue-500">세정학원</div>
          <h1 className="mt-1 text-[24px] font-bold tracking-[-0.03em] text-grey-900">로그인</h1>
        </div>
        <LoginForm next={safeNextPath(next)} />
        <p className="mt-6 text-[12.5px] leading-relaxed text-grey-500">
          아이디·비밀번호를 모르면 학원 데스크(담당 실장님)에 문의해 주세요.
          알림톡으로 받은 링크는 로그인 없이 열려요.
        </p>
      </section>
    </main>
  );
}
