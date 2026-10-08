import { redirect } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { getHqAccounts } from "@/lib/hq";
import { HqShell } from "@/components/hq/HqShell";
import { AccountsAdmin } from "@/components/hq/AccountsAdmin";

export const dynamic = "force-dynamic";

/** 학원 관리자 — 강사 · 조교 · 학생 · 학부모 로그인 아이디를 한곳에서 관리 */
export default async function HqAccountsPage() {
  const viewer = await requireLogin("/hq/accounts");
  if (!viewer.isAdmin) redirect("/");
  const accounts = await getHqAccounts();
  return (
    <HqShell active="accounts" title="계정" subtitle="아이디 변경 · 비밀번호 초기화 · 학생·학부모 계정 발급. 임시 비밀번호는 한 번만 보여요.">
      <AccountsAdmin accounts={accounts} />
    </HqShell>
  );
}
