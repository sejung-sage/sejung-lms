"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createTeacher, updateTeacher, type StaffActionState } from "@/lib/hq-actions";
import type { Branch } from "@/lib/hq";
import { Button } from "@/components/ui/Button";
import { inputCls, labelCls, Message, submitWithoutReset } from "@/components/omr/fields";
import { CredentialNote } from "@/components/staff/Credential";

const initial: StaffActionState = { ok: false, message: "" };
const SUBJECTS = ["국어", "수학", "영어", "과탐", "사탐", "한국사", "제2외국어", "컨설팅", "기타"];

export type TeacherFormValue = {
  name: string; branchId: string; phone: string | null; email: string | null; hiredOn: string | null;
  corporation: string | null; subjects: string[]; employment: "재직" | "퇴사";
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 text-[16px] font-bold text-grey-900">{title}</h2>
      <div className="space-y-4 rounded-card border border-grey-200 bg-white p-5">{children}</div>
    </section>
  );
}

/** ERP 강사 등록과 같은 항목: 성명 · 연락처 · 이메일 · 입사일 · 정산 법인 · 담당 과목 · 상태 */
export function TeacherForm({
  mode, spaceId, value, branches, corporations, erp,
}: {
  mode: "create" | "edit";
  spaceId?: string;
  value?: TeacherFormValue;
  branches: Branch[];
  corporations: string[];
  erp?: boolean;
}) {
  const [state, action, pending] = useActionState(mode === "create" ? createTeacher : updateTeacher.bind(null, spaceId!), initial);
  const v = value;

  return (
    <form onSubmit={submitWithoutReset(action)} className="max-w-[820px] space-y-6">
      {erp && (
        <p className="rounded-md bg-blue-50 px-4 py-3 text-[13px] leading-[1.6] text-blue-600">
          ERP에서 가져온 강사예요. 여기서 고친 기본 정보는 다음 ERP 동기화 때 ERP 값으로 다시 맞춰져요 — 영구 수정은 ERP에서 해 주세요.
        </p>
      )}
      <Section title="기본 정보">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="tf-name">성명</label>
            <input id="tf-name" name="name" required defaultValue={v?.name} placeholder="예: 이지훈T" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="tf-branch">지점</label>
            <select id="tf-branch" name="branchId" defaultValue={v?.branchId ?? branches[0]?.id} disabled={mode === "edit"} className={inputCls}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="tf-phone">연락처 <span className="font-normal text-grey-400">(선택)</span></label>
            <input id="tf-phone" name="phone" type="tel" defaultValue={v?.phone ?? ""} placeholder="010-0000-0000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="tf-email">
              이메일 <span className="font-normal text-grey-400">(선택{mode === "create" ? " · 적으면 LMS 로그인 계정도 만들어요" : ""})</span>
            </label>
            <input id="tf-email" name="email" type="email" defaultValue={v?.email ?? ""} placeholder="teacher@example.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="tf-hired">입사일</label>
            <input id="tf-hired" name="hiredOn" type="date" defaultValue={v?.hiredOn ?? (mode === "create" ? new Date().toISOString().slice(0, 10) : "")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="tf-corp">정산 법인 <span className="font-normal text-grey-400">(선택)</span></label>
            <select id="tf-corp" name="corporation" defaultValue={v?.corporation ?? ""} className={inputCls}>
              <option value="">미지정</option>
              {corporations.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <span className={labelCls}>담당 과목</span>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-grey-200 px-3 py-2 text-[13.5px] has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-600">
                <input type="checkbox" name="subjects" value={s} defaultChecked={v?.subjects.includes(s)} className="size-3.5 accent-blue-500" />
                {s}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:w-1/2">
          <label className={labelCls} htmlFor="tf-emp">상태</label>
          <select id="tf-emp" name="employment" defaultValue={v?.employment ?? "재직"} className={inputCls}>
            <option>재직</option><option>퇴사</option>
          </select>
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "저장 중…" : mode === "create" ? "강사 등록" : "저장"}
        </Button>
        <Message ok={state.ok} message={state.credential ? "" : state.message} />
      </div>
      {state.credential && (
        <div className="space-y-2">
          <CredentialNote state={state} />
          {state.href && <Link href={state.href} className="text-[13.5px] font-semibold text-blue-600 hover:underline">등록한 강사 보기 →</Link>}
        </div>
      )}
    </form>
  );
}
