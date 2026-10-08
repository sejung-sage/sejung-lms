"use client";

import { useActionState, useState } from "react";
import { registerTeacher, type StaffActionState } from "@/lib/hq-actions";
import { Button } from "@/components/ui/Button";
import { inputCls, labelCls } from "@/components/omr/fields";
import { CredentialNote } from "@/components/staff/Credential";

const initial: StaffActionState = { ok: false, message: "" };

/** 강사 등록 — 이메일 계정 + 담당 공간(기존 공간 또는 새 공간) */
export function RegisterTeacherForm({ spaces }: { spaces: { id: string; name: string; ownerName: string | null }[] }) {
  const [state, action, pending] = useActionState(registerTeacher, initial);
  const [spaceId, setSpaceId] = useState("");

  return (
    <form action={action} className="space-y-3.5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="t-name">이름</label>
          <input id="t-name" name="name" required className={inputCls} placeholder="이도윤" />
        </div>
        <div>
          <label className={labelCls} htmlFor="t-email">이메일 (로그인 아이디)</label>
          <input id="t-email" name="email" type="email" required className={inputCls} placeholder="teacher@dcsj.kr" />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="t-space">담당 공간</label>
        <select id="t-space" name="spaceId" value={spaceId} onChange={(e) => setSpaceId(e.target.value)} className={inputCls}>
          <option value="">나중에 지정</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}{s.ownerName ? ` (주 강사 ${s.ownerName} · 공동 강사로 추가)` : " (담당 강사 없음)"}
            </option>
          ))}
          <option value="new">+ 새 강사 공간 만들기</option>
        </select>
      </div>

      {spaceId === "new" && (
        <div className="grid gap-3 rounded-md bg-panel p-3.5 sm:grid-cols-4">
          <div className="sm:col-span-1">
            <label className={labelCls} htmlFor="t-sname">공간 이름</label>
            <input id="t-sname" name="spaceName" required className={inputCls} placeholder="이쌤" />
          </div>
          <div>
            <label className={labelCls} htmlFor="t-subj">과목</label>
            <input id="t-subj" name="subject" className={inputCls} placeholder="수학" />
          </div>
          <div>
            <label className={labelCls} htmlFor="t-slug">주소</label>
            <input id="t-slug" name="slug" required className={inputCls} placeholder="lee-math" />
          </div>
          <div>
            <label className={labelCls} htmlFor="t-accent">테마색</label>
            <input id="t-accent" name="accent" type="color" defaultValue="#3182f6" className={`${inputCls} p-1`} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "등록 중…" : "강사 등록"}
        </Button>
        <span className="text-[12.5px] text-grey-500">임시 비밀번호가 만들어지고, 첫 로그인 때 본인이 바꿔요.</span>
      </div>
      <CredentialNote state={state} />
    </form>
  );
}
