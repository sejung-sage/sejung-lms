"use client";

import { useActionState, useState } from "react";
import { changeLoginId, issueFamilyAccount, resetTeacherPassword, type StaffActionState } from "@/lib/hq-actions";
import type { AccountKind, HqAccount } from "@/lib/hq";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { CredentialNote } from "@/components/staff/Credential";

const initial: StaffActionState = { ok: false, message: "" };
const TABS: { key: AccountKind; label: string }[] = [
  { key: "teacher", label: "강사" }, { key: "assistant", label: "조교" },
  { key: "student", label: "학생" }, { key: "parent", label: "학부모" },
];
const field = "h-8 rounded-sm border border-grey-200 bg-white px-2 font-mono text-[13px] outline-none focus:border-blue-500";

function IdCell({ a }: { a: HqAccount }) {
  // 연 시각보다 나중에 저장이 성공하면 닫는다 — effect 에서 setState 하지 않으려고 시각으로 비교
  const [openedAt, setOpenedAt] = useState(0);
  const [state, action, pending] = useActionState(changeLoginId.bind(null, a.profileId!), initial);
  const editing = openedAt > 0 && !(state.ok && (state.at ?? 0) > openedAt);
  const setEditing = (on: boolean) => setOpenedAt(on ? Date.now() : 0);
  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-[13px] font-semibold text-grey-900">{a.loginId}</span>
        <button type="button" onClick={() => setEditing(true)} className="text-[12px] font-semibold text-grey-400 hover:text-blue-600">변경</button>
        {state.ok && openedAt > 0 && <span className="text-[12px] text-green-500">{state.message}</span>}
      </div>
    );
  }
  return (
    <form action={action} className="space-y-1">
      <div className="flex items-center gap-1.5">
        <input name="loginId" defaultValue={a.loginId ?? ""} autoFocus aria-label="새 아이디" className={`${field} w-32`} />
        <Button type="submit" variant="weak" size="xs" disabled={pending}>저장</Button>
        <button type="button" onClick={() => setEditing(false)} className="text-[12px] text-grey-400 hover:text-grey-700">취소</button>
      </div>
      {state.message && <p className={`text-[12px] ${state.ok ? "text-green-500" : "text-red-500"}`}>{state.message}</p>}
    </form>
  );
}

function Actions({ a }: { a: HqAccount }) {
  const [rState, reset, resetting] = useActionState(resetTeacherPassword.bind(null, a.profileId ?? "", a.name, a.loginId ?? ""), initial);
  const [iState, issue, issuing] = useActionState(
    issueFamilyAccount.bind(null, a.kind === "parent" ? "parent" : "student", a.entityId ?? ""), initial,
  );
  if (!a.profileId) {
    return (
      <form action={issue} className="flex flex-col items-end gap-1.5">
        <Button type="submit" variant="primary" size="xs" disabled={issuing}>계정 발급</Button>
        {iState.message && <div className="w-[300px] text-left"><CredentialNote state={iState} /></div>}
      </form>
    );
  }
  return (
    <form action={reset} onSubmit={(e) => { if (!confirm(`${a.name}의 비밀번호를 새 임시 비밀번호로 바꿀까요?`)) e.preventDefault(); }}
      className="flex flex-col items-end gap-1.5">
      <Button type="submit" variant="secondary" size="xs" disabled={resetting}>비밀번호 초기화</Button>
      {rState.message && <div className="w-[300px] text-left"><CredentialNote state={rState} /></div>}
    </form>
  );
}

/** 학원 관리자가 모든 로그인 아이디를 한곳에서 — 강사 · 조교 · 학생 · 학부모 */
export function AccountsAdmin({ accounts }: { accounts: HqAccount[] }) {
  const [tab, setTab] = useState<AccountKind>("teacher");
  const [q, setQ] = useState("");
  const rows = accounts.filter((a) => a.kind === tab && (!q || a.name.includes(q) || (a.loginId ?? "").includes(q.toLowerCase()) || a.detail.includes(q)));
  const count = (k: AccountKind) => accounts.filter((a) => a.kind === k).length;
  const missing = accounts.filter((a) => a.kind === tab && !a.profileId).length;

  return (
    <div className="rounded-card border border-grey-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-grey-200 px-4 py-3">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`h-9 rounded-full px-3.5 text-[13px] font-semibold ${tab === t.key ? "bg-grey-900 text-white" : "bg-grey-100 text-grey-600 hover:bg-grey-200"}`}>
            {t.label} <span className="num ml-0.5 opacity-70">{count(t.key)}</span>
          </button>
        ))}
        {missing > 0 && <Badge tone="amber">계정 미발급 {missing}명</Badge>}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 아이디 · 소속 검색" aria-label="검색"
          className="ml-auto h-9 w-full max-w-[260px] rounded-sm border border-grey-200 px-2.5 text-[13.5px] outline-none focus:border-blue-500" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead className="border-b border-grey-100">
            <tr className="text-left text-[12.5px] font-semibold text-grey-600">
              <th className="px-4 py-2.5">이름</th><th className="px-3 py-2.5">아이디</th><th className="px-3 py-2.5">소속</th>
              <th className="px-3 py-2.5">연락처</th><th className="px-3 py-2.5">최근 로그인</th><th className="px-4 py-2.5 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-100 text-[13.5px]">
            {rows.map((a) => (
              <tr key={`${a.kind}-${a.profileId ?? a.entityId}`} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-grey-900">{a.name}</td>
                <td className="px-3 py-3">{a.profileId ? <IdCell a={a} /> : <Badge tone="amber">미발급</Badge>}</td>
                <td className="max-w-[380px] px-3 py-3 text-grey-600">{a.detail}</td>
                <td className="num whitespace-nowrap px-3 py-3 text-grey-600">{a.phone ?? "—"}</td>
                <td className="num whitespace-nowrap px-3 py-3 text-grey-500">{a.lastSignIn ? a.lastSignIn.slice(0, 16).replace("T", " ") : "—"}</td>
                <td className="px-4 py-2.5 text-right"><Actions a={a} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="py-16 text-center text-grey-400">조건에 맞는 계정이 없어요</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="border-t border-grey-100 px-4 py-2.5 text-[12.5px] text-grey-500">총 {rows.length}명</div>
    </div>
  );
}
