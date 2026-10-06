"use client";

import { useActionState } from "react";
import {
  issueMissingAccounts, resetPassword, type AccountActionState,
} from "@/lib/account-actions";
import type { AccountRow } from "@/lib/accounts";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";

const initial: AccountActionState = { ok: false, message: "", issued: [] };

/**
 * 학생·학부모 계정 발급 패널.
 * 임시 비밀번호는 이 화면에 한 번만 보인다(어디에도 저장하지 않는다). 인쇄해서 나눠주거나 옮겨 적게 한다.
 */
export function AccountsPanel({ slug, rows, canManage }: { slug: string; rows: AccountRow[]; canManage: boolean }) {
  const [issueState, issue, issuing] = useActionState(issueMissingAccounts.bind(null, slug), initial);
  const missing = rows.filter((r) => !r.profileId).length;

  return (
    <div className="rounded-card border border-grey-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grey-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-grey-900">로그인 계정</span>
          <span className="text-[13px] text-grey-500">
            · 학생·학부모 {rows.length}명 중 {rows.length - missing}명 발급
          </span>
        </div>
        {canManage && (
          <form action={issue}>
            <Button type="submit" variant="primary" size="sm" disabled={issuing || !missing}>
              {issuing ? "발급 중…" : `미발급 ${missing}명 일괄 발급`}
            </Button>
          </form>
        )}
      </div>

      <Credentials state={issueState} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px]">
          <thead className="border-b border-grey-100">
            <tr className="text-left text-[12.5px] font-semibold text-grey-600">
              <th className="px-3 py-2.5">이름</th><th className="px-3 py-2.5">구분</th>
              <th className="px-3 py-2.5">아이디</th><th className="px-3 py-2.5 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-100">
            {rows.map((r) => (
              <tr key={`${r.kind}-${r.id}`} className="text-[13.5px]">
                <td className="h-11 px-3 font-semibold text-grey-900">{r.name}</td>
                <td className="px-3 text-grey-600">{r.kind === "student" ? "학생" : `학부모 · ${r.of}`}</td>
                <td className="num px-3 text-grey-700">
                  {r.loginId ?? (r.profileId ? "—" : <Badge tone="amber">미발급</Badge>)}
                </td>
                <td className="px-3 text-right">
                  {canManage && r.profileId ? <ResetButton slug={slug} row={r} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResetButton({ slug, row }: { slug: string; row: AccountRow }) {
  const [state, action, pending] = useActionState(resetPassword.bind(null, slug, row.kind, row.id), initial);
  return (
    <form
      action={action}
      onSubmit={(e) => { if (!confirm(`${row.name}의 비밀번호를 새 임시 비밀번호로 바꿀까요?`)) e.preventDefault(); }}
      className="inline-flex flex-col items-end gap-1"
    >
      <Button type="submit" variant="secondary" size="xs" disabled={pending}>비밀번호 초기화</Button>
      {state.issued[0] && (
        <span className="num text-[12px] text-grey-700">
          임시 비밀번호 <b className="font-mono text-grey-900">{state.issued[0].password}</b>
        </span>
      )}
      {!state.ok && state.message && <span className="text-[12px] text-red-500">{state.message}</span>}
    </form>
  );
}

function Credentials({ state }: { state: AccountActionState }) {
  if (!state.message) return null;
  return (
    <div className="space-y-2 border-b border-grey-200 bg-panel px-4 py-3">
      <p className={`text-[13px] font-medium ${state.ok ? "text-green-500" : "text-red-500"}`}>{state.message}</p>
      {state.issued.length > 0 && (
        <>
          <p className="text-[12.5px] text-amber-500">
            임시 비밀번호는 지금 한 번만 보여요. 인쇄하거나 옮겨 적어 나눠 주세요. 첫 로그인 때 본인이 새 비밀번호로 바꿔요.
          </p>
          <table className="w-full max-w-[560px] bg-white text-[13px]">
            <thead>
              <tr className="text-left text-grey-500"><th className="px-2 py-1">이름</th><th className="px-2 py-1">구분</th><th className="px-2 py-1">아이디</th><th className="px-2 py-1">임시 비밀번호</th></tr>
            </thead>
            <tbody>
              {state.issued.map((c) => (
                <tr key={c.loginId} className="border-t border-grey-100">
                  <td className="px-2 py-1 font-semibold">{c.name}</td>
                  <td className="px-2 py-1">{c.kind === "student" ? "학생" : "학부모"}</td>
                  <td className="num px-2 py-1 font-mono">{c.loginId}</td>
                  <td className="num px-2 py-1 font-mono font-bold">{c.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button variant="secondary" size="xs" onClick={() => window.print()}>이 목록 인쇄</Button>
        </>
      )}
    </div>
  );
}
