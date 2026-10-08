"use client";

import { useActionState, useTransition } from "react";
import {
  issueTeacherAccount, addCoTeacher, revokeSpace, toggleManage, resetTeacherPassword, type StaffActionState,
} from "@/lib/hq-actions";
import type { HqTeacherDetail } from "@/lib/hq";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { inputCls } from "@/components/omr/fields";
import { CredentialNote } from "@/components/staff/Credential";

const initial: StaffActionState = { ok: false, message: "" };

function OwnerRow({ t }: { t: HqTeacherDetail }) {
  const o = t.owner!;
  const [state, reset, resetting] = useActionState(resetTeacherPassword.bind(null, o.id, o.name, o.email), initial);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-[14px] font-bold text-blue-600">{o.name.charAt(0)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[14.5px] font-semibold text-grey-900">{o.name} <Badge tone="blue">주 강사</Badge></div>
          <div className="font-mono text-[12.5px] text-grey-500">{o.email}</div>
        </div>
        <form action={reset} onSubmit={(e) => { if (!confirm(`${o.name}의 비밀번호를 초기화할까요?`)) e.preventDefault(); }}>
          <Button type="submit" variant="secondary" size="xs" disabled={resetting}>비밀번호 초기화</Button>
        </form>
        <Button variant="ghost" size="xs" disabled={pending}
          onClick={() => { if (confirm(`${o.name}의 이 공간 권한을 회수할까요? 계정은 남아요.`)) start(() => revokeSpace(o.id, t.id)); }}>
          권한 회수
        </Button>
      </div>
      {state.message && <CredentialNote state={state} />}
    </div>
  );
}

function CoRow({ spaceId, c }: { spaceId: string; c: HqTeacherDetail["coTeacherList"][number] }) {
  const [pending, start] = useTransition();
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-grey-900">{c.name}</div>
        <div className="font-mono text-[12px] text-grey-500">{c.email}</div>
      </div>
      <button type="button" disabled={pending} onClick={() => start(() => toggleManage(c.id, spaceId, !c.canManage))}
        className={`rounded-xs px-2 py-1 text-[12px] font-semibold ${c.canManage ? "bg-green-50 text-green-600" : "bg-grey-100 text-grey-500"}`}>
        학생 관리 {c.canManage ? "O" : "X"}
      </button>
      <Button variant="ghost" size="xs" disabled={pending}
        onClick={() => { if (confirm(`${c.name}을(를) 공동 강사에서 뺄까요?`)) start(() => revokeSpace(c.id, spaceId)); }}>
        빼기
      </Button>
    </li>
  );
}

/** 이 강사 공간에 누가 LMS 로 들어오는가 — 주 강사 계정 · 공동 강사 */
export function TeacherAccount({ t }: { t: HqTeacherDetail }) {
  const [iState, issue, issuing] = useActionState(issueTeacherAccount.bind(null, t.id), initial);
  const [cState, addCo, adding] = useActionState(addCoTeacher.bind(null, t.id), initial);

  return (
    <div className="space-y-5">
      {t.owner ? (
        <>
          <OwnerRow t={t} />
          {/* 발급 직후엔 화면이 '계정 있음'으로 바뀐다 — 임시 비밀번호는 여기서 한 번 보여준다 */}
          {iState.credential && <CredentialNote state={iState} />}
        </>
      ) : (
        <form action={issue} className="space-y-2.5">
          <p className="text-[13px] text-grey-600">아직 LMS 계정이 없어요. 이메일을 적으면 계정을 만들고 이 공간의 주 강사로 연결해요.</p>
          <div className="flex flex-wrap gap-2">
            <input name="name" defaultValue={t.name} aria-label="이름" className={`${inputCls} max-w-[160px]`} />
            <input name="email" type="email" required defaultValue={t.email ?? ""} placeholder="로그인 이메일" aria-label="로그인 이메일" className={`${inputCls} max-w-[300px]`} />
            <Button type="submit" variant="primary" size="sm" className="h-10" disabled={issuing}>{issuing ? "만드는 중…" : "LMS 계정 발급"}</Button>
          </div>
          <CredentialNote state={iState} />
        </form>
      )}

      <div className="border-t border-grey-100 pt-4">
        <div className="mb-1 text-[13.5px] font-bold text-grey-800">공동 강사 <span className="num font-normal text-grey-400">{t.coTeacherList.length}</span></div>
        {t.coTeacherList.length > 0 && (
          <ul className="divide-y divide-grey-100">{t.coTeacherList.map((c) => <CoRow key={c.id} spaceId={t.id} c={c} />)}</ul>
        )}
        <form action={addCo} className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            <input name="name" placeholder="이름" aria-label="공동 강사 이름" className={`${inputCls} max-w-[160px]`} />
            <input name="email" type="email" required placeholder="공동 강사 이메일" aria-label="공동 강사 이메일" className={`${inputCls} max-w-[300px]`} />
            <Button type="submit" variant="weak" size="sm" className="h-10" disabled={adding}>공동 강사 추가</Button>
          </div>
          <CredentialNote state={cState} />
        </form>
      </div>
    </div>
  );
}
