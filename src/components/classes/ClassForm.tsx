"use client";

import { useActionState, useMemo, useState } from "react";
import type { StaffActionState } from "@/lib/hq-actions";
import type { Slot } from "@/lib/hq";
import { Button } from "@/components/ui/Button";
import { inputCls, labelCls, Message, submitWithoutReset } from "@/components/omr/fields";

const initial: StaffActionState = { ok: false, message: "" };
const SUBJECTS = ["국어", "수학", "영어", "과탐", "사탐", "한국사", "제2외국어", "논술", "컨설팅", "기타"];
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export type ClassFormValue = {
  title: string; subject: string | null; subjectDetail: string | null; kind: "regular" | "special";
  description: string | null; startsOn: string | null; endsOn: string | null; totalSessions: number | null;
  pricePerSession: number | null; capacity: number | null; isClosed: boolean; slots: Slot[];
};

type TeacherOption = { id: string; name: string; branch: string; subjects: string[] };

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 text-[16px] font-bold text-grey-900">{title}</h2>
      <div className="space-y-4 rounded-card border border-grey-200 bg-white p-5">{children}</div>
    </section>
  );
}

const won = (n: number) => n.toLocaleString("ko-KR");

/**
 * ERP 강좌 개설과 같은 순서: 기본 정보 → 담당 강사 → 수업 요일·시간 → 수업일 · 수강료 · 정원
 * teachers 를 넘기면(HQ) 담당 강사를 고르고, 없으면(강사 화면) 지금 공간의 강좌로 만든다.
 */
export function ClassForm({
  action, value, teachers, submitLabel, readOnly,
}: {
  action: (prev: StaffActionState, form: FormData) => Promise<StaffActionState>;
  value?: ClassFormValue;
  teachers?: TeacherOption[];
  submitLabel: string;
  readOnly?: boolean;
}) {
  const [state, run, pending] = useActionState(action, initial);
  const [slots, setSlots] = useState<Slot[]>(value?.slots ?? []);
  const [sessions, setSessions] = useState(value?.totalSessions?.toString() ?? "");
  const [price, setPrice] = useState(value?.pricePerSession?.toString() ?? "");
  const [tq, setTq] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const tuition = (Number(sessions) || 0) * (Number(price.replace(/\D/g, "")) || 0);
  const matches = useMemo(
    () => (teachers ?? []).filter((t) => !tq || t.name.includes(tq) || t.subjects.some((s) => s.includes(tq)) || t.branch.includes(tq)).slice(0, 8),
    [teachers, tq],
  );
  const picked = teachers?.find((t) => t.id === teacherId);
  const dis = readOnly || pending;

  return (
    <form onSubmit={submitWithoutReset(run)} className="max-w-[820px] space-y-6">
      <fieldset disabled={readOnly} className="space-y-6">
        <Section title="기본 정보">
          <div>
            <label className={labelCls} htmlFor="cf-title">강좌명</label>
            <input id="cf-title" name="title" required defaultValue={value?.title} placeholder="예: 고1 수학 개념반 월목" className={inputCls} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="cf-subject">과목</label>
              <select id="cf-subject" name="subject" required defaultValue={value?.subject ?? ""} className={inputCls}>
                <option value="" disabled>선택</option>
                {[...new Set([...SUBJECTS, ...(value?.subject ? [value.subject] : [])])].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="cf-detail">상세과목 <span className="font-normal text-grey-400">(선택)</span></label>
              <input id="cf-detail" name="subjectDetail" defaultValue={value?.subjectDetail ?? ""} placeholder="예: 미적분" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="cf-kind">강좌 종류</label>
              <select id="cf-kind" name="kind" defaultValue={value?.kind ?? "regular"} className={inputCls}>
                <option value="regular">정규</option><option value="special">특강</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="cf-desc">설명 <span className="font-normal text-grey-400">(선택)</span></label>
              <input id="cf-desc" name="description" defaultValue={value?.description ?? ""} placeholder="예: 수학Ⅱ 미분 · 주간 테스트" className={inputCls} />
            </div>
          </div>
        </Section>

        {teachers && (
          <Section title="담당 강사">
            <input type="hidden" name="spaceId" value={teacherId} />
            {picked ? (
              <div className="flex items-center gap-3 rounded-md bg-panel px-3.5 py-2.5">
                <span className="text-[14.5px] font-semibold">{picked.name}</span>
                <span className="text-[13px] text-grey-500">{picked.branch} · {picked.subjects.join(", ") || "과목 없음"}</span>
                <button type="button" onClick={() => setTeacherId("")} className="ml-auto text-[13px] font-semibold text-grey-500 hover:text-grey-900">바꾸기</button>
              </div>
            ) : (
              <div>
                <input value={tq} onChange={(e) => setTq(e.target.value)} placeholder="강사명 · 과목 · 지점 검색" aria-label="강사 검색" className={`${inputCls} max-w-[340px]`} />
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {matches.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => setTeacherId(t.id)}
                        className="flex w-full items-center gap-2 rounded-sm border border-grey-200 px-3 py-2 text-left text-[13.5px] hover:border-blue-500 hover:bg-blue-50">
                        <b className="font-semibold">{t.name}</b>
                        <span className="truncate text-[12.5px] text-grey-500">{t.branch} · {t.subjects.join(", ")}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        <Section title="수업 요일·시간">
          {slots.length === 0 && <p className="text-[13px] text-grey-500">수업 요일·시간이 없으면 미배치 강의로 등록돼요.</p>}
          {slots.map((s, i) => (
            <div key={i} className="grid grid-cols-[90px_1fr_1fr_1.4fr_auto] items-center gap-2">
              <select name="slotDay" defaultValue={s.weekday} aria-label="요일" className={inputCls}>
                {WEEKDAYS.map((d) => <option key={d}>{d}</option>)}
              </select>
              <input name="slotStart" type="time" defaultValue={s.start_time} aria-label="시작" className={inputCls} />
              <input name="slotEnd" type="time" defaultValue={s.end_time} aria-label="끝" className={inputCls} />
              <input name="slotRoom" defaultValue={s.room_name ?? ""} placeholder="강의실 (예: 대치관 701)" aria-label="강의실" className={inputCls} />
              <button type="button" aria-label="시간 삭제" onClick={() => setSlots((x) => x.filter((_, j) => j !== i))}
                className="flex size-9 items-center justify-center rounded-full text-grey-400 hover:bg-red-50 hover:text-red-500">×</button>
            </div>
          ))}
          <Button type="button" variant="outline" size="xs" onClick={() => setSlots((x) => [...x, { weekday: "월", start_time: "18:00", end_time: "20:00", room_name: null }])}>
            + 시간 추가
          </Button>
        </Section>

        <Section title="수업일 · 수강료">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls} htmlFor="cf-start">개강일</label>
              <input id="cf-start" name="startsOn" type="date" defaultValue={value?.startsOn ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="cf-end">종강일 <span className="font-normal text-grey-400">(선택)</span></label>
              <input id="cf-end" name="endsOn" type="date" defaultValue={value?.endsOn ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="cf-sessions">회차</label>
              <input id="cf-sessions" name="totalSessions" inputMode="numeric" value={sessions} onChange={(e) => setSessions(e.target.value.replace(/\D/g, ""))} placeholder="8" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="cf-price">회차당 수강료</label>
              <input id="cf-price" name="pricePerSession" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="35000" className={inputCls} />
            </div>
            <div>
              <span className={labelCls}>반 수강료</span>
              <div className="num flex h-10 items-center text-[15px] font-bold text-grey-900">{tuition ? `${won(tuition)}원` : "—"}</div>
            </div>
            <div>
              <label className={labelCls} htmlFor="cf-cap">정원 <span className="font-normal text-grey-400">(선택)</span></label>
              <input id="cf-cap" name="capacity" inputMode="numeric" defaultValue={value?.capacity ?? ""} placeholder="없음" className={inputCls} />
            </div>
          </div>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-[14px] font-semibold text-grey-800">
            <input type="checkbox" name="isClosed" defaultChecked={value?.isClosed} className="size-4 accent-blue-500" />
            종강
          </label>
        </Section>
      </fieldset>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" size="md" disabled={dis || (!!teachers && !teacherId)}>
            {pending ? "저장 중…" : submitLabel}
          </Button>
          {teachers && !teacherId && <span className="text-[13px] text-grey-500">담당 강사를 먼저 골라 주세요</span>}
          <Message ok={state.ok} message={state.message} />
        </div>
      )}
    </form>
  );
}
