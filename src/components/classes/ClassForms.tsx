"use client";

import { useActionState, useState, useTransition } from "react";
import { assignAssistant, unassignAssistant, saveClassMembers } from "@/lib/class-actions";
import type { StaffActionState } from "@/lib/hq-actions";
import type { ClassDetail } from "@/lib/staff";
import { Button } from "@/components/ui/Button";
import { inputCls, Message, submitWithoutReset } from "@/components/omr/fields";
import { CredentialNote } from "@/components/staff/Credential";

const initial: StaffActionState = { ok: false, message: "" };

function AssignedRow({ slug, classId, a, canManage }: { slug: string; classId: string; a: ClassDetail["assistants"][number]; canManage: boolean }) {
  const [pending, start] = useTransition();
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-[13px] font-bold text-blue-600">{a.name.charAt(0)}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-grey-900">{a.name}</div>
        <div className="truncate font-mono text-[12px] text-grey-500">{a.email}</div>
      </div>
      <span className="text-[12px] text-grey-500">채점 · 출결</span>
      {canManage && (
        <Button
          variant="ghost" size="xs" disabled={pending}
          onClick={() => { if (confirm(`${a.name} 조교를 이 강좌에서 뺄까요?`)) start(() => unassignAssistant(slug, classId, a.id)); }}
        >
          배정 해제
        </Button>
      )}
    </li>
  );
}

export function AssistantPanel({ slug, cls, canManage }: { slug: string; cls: ClassDetail; canManage: boolean }) {
  const [state, action, pending] = useActionState(assignAssistant.bind(null, slug, cls.id), initial);
  const [mode, setMode] = useState<"pick" | "new">(cls.assistants.some((a) => !a.assigned) ? "pick" : "new");
  const assigned = cls.assistants.filter((a) => a.assigned);
  const others = cls.assistants.filter((a) => !a.assigned);

  return (
    <div>
      {assigned.length ? (
        <ul className="divide-y divide-grey-100 border-b border-grey-100">
          {assigned.map((a) => <AssignedRow key={a.id} slug={slug} classId={cls.id} a={a} canManage={canManage} />)}
        </ul>
      ) : (
        <p className="border-b border-grey-100 px-4 py-6 text-center text-[13px] text-grey-400">아직 배정된 조교가 없어요</p>
      )}

      {canManage && (
        <form action={action} className="space-y-3 px-4 py-4">
          <div className="flex gap-1.5">
            {others.length > 0 && (
              <button type="button" onClick={() => setMode("pick")}
                className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${mode === "pick" ? "bg-grey-900 text-white" : "bg-grey-100 text-grey-600"}`}>
                기존 조교에서 고르기
              </button>
            )}
            <button type="button" onClick={() => setMode("new")}
              className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${mode === "new" ? "bg-grey-900 text-white" : "bg-grey-100 text-grey-600"}`}>
              새 조교 등록
            </button>
          </div>

          {mode === "pick" && others.length > 0 ? (
            <div className="flex gap-2">
              <select name="assistantId" required className={inputCls} defaultValue="">
                <option value="" disabled>조교 선택</option>
                {others.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.email}</option>)}
              </select>
              <Button type="submit" variant="primary" size="sm" className="h-10" disabled={pending}>배정</Button>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
              <input name="name" required className={inputCls} placeholder="조교 이름" aria-label="조교 이름" />
              <input name="email" type="email" required className={inputCls} placeholder="조교 이메일 (로그인 아이디)" aria-label="조교 이메일" />
              <Button type="submit" variant="primary" size="sm" className="h-10" disabled={pending}>
                {pending ? "등록 중…" : "등록하고 배정"}
              </Button>
            </div>
          )}
          <p className="text-[12px] text-grey-500">조교는 채점·출결·할 일 처리를 할 수 있고, 학생 계정 발급과 강좌 설정은 할 수 없어요.</p>
          <CredentialNote state={state} />
        </form>
      )}
    </div>
  );
}

export function MembersForm({ slug, cls, canManage }: { slug: string; cls: ClassDetail; canManage: boolean }) {
  const [state, action, pending] = useActionState(saveClassMembers.bind(null, slug, cls.id), initial);
  const [picked, setPicked] = useState(() => new Set(cls.members));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <form onSubmit={submitWithoutReset(action)}>
      <div className="flex items-center justify-between border-b border-grey-100 px-4 py-2.5 text-[13px] text-grey-600">
        <span><b className="num text-grey-900">{picked.size}</b>명 선택 · 공간 재원생 {cls.roster.length}명</span>
        {canManage && (
          <div className="flex items-center gap-2">
            <Message ok={state.ok} message={state.message} />
            <Button type="submit" variant="primary" size="xs" disabled={pending}>수강생 저장</Button>
          </div>
        )}
      </div>
      <ul className="grid gap-x-4 px-4 py-2 sm:grid-cols-2 lg:grid-cols-3">
        {cls.roster.map((s) => (
          <li key={s.id}>
            <label className={`flex items-center gap-2.5 rounded-sm px-1 py-2 text-[13.5px] ${canManage ? "cursor-pointer hover:bg-grey-50" : ""}`}>
              <input
                type="checkbox" name="student" value={s.id} checked={picked.has(s.id)} disabled={!canManage}
                onChange={() => toggle(s.id)} className="size-4 accent-blue-500"
              />
              <span className="font-semibold text-grey-900">{s.name}</span>
              <span className="text-[12.5px] text-grey-500">{[s.school, s.grade].filter(Boolean).join(" · ")}</span>
            </label>
          </li>
        ))}
      </ul>
    </form>
  );
}
