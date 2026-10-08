"use client";

import { useActionState, useTransition } from "react";
import {
  grantSpace, revokeSpace, toggleManage, resetTeacherPassword, type StaffActionState,
} from "@/lib/hq-actions";
import type { TeacherRow } from "@/lib/staff";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { CredentialNote } from "@/components/staff/Credential";

const initial: StaffActionState = { ok: false, message: "" };

const sel =
  "h-8 rounded-sm border border-grey-200 bg-white px-2 text-[13px] text-grey-800 outline-none focus:border-blue-500";

function SpaceChip({ t, s }: { t: TeacherRow; s: TeacherRow["spaces"][number] }) {
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-grey-200 bg-white py-1 pl-2.5 pr-1.5 text-[13px]">
      <b className="font-semibold text-grey-900">{s.name}</b>
      {s.owner ? (
        <Badge tone="blue">주 강사</Badge>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => toggleManage(t.userId, s.id, !s.canManage))}
          title="학생 관리(계정 발급·강좌·조교 배정) 권한"
          className={`rounded-xs px-1.5 py-0.5 text-[11.5px] font-semibold ${s.canManage ? "bg-green-50 text-green-600" : "bg-grey-100 text-grey-500"}`}
        >
          공동 · 관리 {s.canManage ? "O" : "X"}
        </button>
      )}
      <button
        type="button"
        aria-label={`${s.name} 권한 회수`}
        disabled={pending}
        onClick={() => { if (confirm(`${t.name}의 ${s.name} 권한을 회수할까요?`)) start(() => revokeSpace(t.userId, s.id)); }}
        className="flex size-5 items-center justify-center rounded-full text-grey-400 hover:bg-red-50 hover:text-red-500"
      >
        ×
      </button>
    </span>
  );
}

function Row({ t, spaces }: { t: TeacherRow; spaces: { id: string; name: string }[] }) {
  const [gState, grant, granting] = useActionState(grantSpace.bind(null, t.userId), initial);
  const [rState, reset, resetting] = useActionState(resetTeacherPassword.bind(null, t.userId, t.name, t.email), initial);
  const free = spaces.filter((s) => !t.spaces.some((x) => x.id === s.id));

  return (
    <tr className="align-top">
      <td className="px-3 py-3">
        <div className="text-[14px] font-semibold text-grey-900">{t.name}</div>
        <div className="font-mono text-[12.5px] text-grey-500">{t.email}</div>
        <div className="mt-0.5 text-[12px] text-grey-400">
          {t.lastSignIn ? `최근 로그인 ${t.lastSignIn.slice(0, 10)}` : "아직 로그인 안 함"}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          {t.spaces.length ? t.spaces.map((s) => <SpaceChip key={s.id} t={t} s={s} />) : <span className="text-[13px] text-grey-400">담당 공간 없음</span>}
        </div>
        {free.length > 0 && (
          <form action={grant} className="mt-2 flex items-center gap-1.5">
            <select name="spaceId" className={sel} defaultValue="">
              <option value="" disabled>공간 추가…</option>
              {free.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Button type="submit" variant="weak" size="xs" disabled={granting}>권한 주기</Button>
          </form>
        )}
        {!gState.ok && gState.message && <p className="mt-1 text-[12px] text-red-500">{gState.message}</p>}
      </td>
      <td className="px-3 py-3 text-right">
        <form action={reset} onSubmit={(e) => { if (!confirm(`${t.name}의 비밀번호를 초기화할까요?`)) e.preventDefault(); }}>
          <Button type="submit" variant="secondary" size="xs" disabled={resetting}>비밀번호 초기화</Button>
        </form>
        {rState.message && <div className="mt-2 text-left"><CredentialNote state={rState} /></div>}
      </td>
    </tr>
  );
}

export function TeacherTable({ teachers, spaces }: { teachers: TeacherRow[]; spaces: { id: string; name: string }[] }) {
  if (!teachers.length) {
    return <div className="py-12 text-center text-[13.5px] text-grey-400">등록된 강사가 없어요. 위에서 첫 강사를 등록해 주세요.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px]">
        <thead className="border-b border-grey-100">
          <tr className="text-left text-[12.5px] font-semibold text-grey-600">
            <th className="px-3 py-2.5">강사</th>
            <th className="px-3 py-2.5">담당 공간 · 권한</th>
            <th className="px-3 py-2.5 text-right">계정</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-100">
          {teachers.map((t) => <Row key={t.userId} t={t} spaces={spaces} />)}
        </tbody>
      </table>
    </div>
  );
}
