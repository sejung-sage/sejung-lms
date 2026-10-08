"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Branch, HqTeacher } from "@/lib/hq";
import { Badge } from "@/components/ui/Card";

const sel = "h-9 rounded-sm border border-grey-200 bg-white px-2.5 text-[13.5px] text-grey-800 outline-none focus:border-blue-500";

/** ERP 강사 목록과 같은 열 — 강사 · 연락처 · 과목 · 강좌 · 정산 법인 · 상태 + LMS 계정 */
export function TeacherList({ teachers, branches, defaultBranch }: { teachers: HqTeacher[]; branches: Branch[]; defaultBranch: string }) {
  const [branch, setBranch] = useState(defaultBranch);
  const [status, setStatus] = useState<"재직" | "퇴사" | "all">("재직");
  const [subject, setSubject] = useState("");
  const [q, setQ] = useState("");
  const [account, setAccount] = useState<"" | "yes" | "no">("");

  const inBranch = useMemo(() => teachers.filter((t) => !branch || t.branchId === branch), [teachers, branch]);
  const subjects = useMemo(() => [...new Set(inBranch.flatMap((t) => t.subjects))].sort((a, b) => a.localeCompare(b, "ko")), [inBranch]);
  const rows = inBranch.filter((t) =>
    (status === "all" || t.employment === status) &&
    (!subject || t.subjects.includes(subject)) &&
    (!account || (account === "yes") === !!t.owner) &&
    (!q || t.name.includes(q) || (t.phone ?? "").includes(q) || t.openClasses.some((c) => c.includes(q))),
  );
  const count = (s: "재직" | "퇴사" | "all") => inBranch.filter((t) => s === "all" || t.employment === s).length;

  return (
    <div className="rounded-card border border-grey-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-grey-200 px-4 py-3">
        <select aria-label="지점" value={branch} onChange={(e) => setBranch(e.target.value)} className={sel}>
          <option value="">전체 지점</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div className="flex gap-1">
          {(["재직", "퇴사", "all"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className={`h-9 rounded-full px-3.5 text-[13px] font-semibold ${status === s ? "bg-grey-900 text-white" : "bg-grey-100 text-grey-600 hover:bg-grey-200"}`}>
              {s === "all" ? "전체" : s} <span className="num ml-0.5 opacity-70">{count(s)}</span>
            </button>
          ))}
        </div>
        <select aria-label="과목" value={subject} onChange={(e) => setSubject(e.target.value)} className={sel}>
          <option value="">전체 과목</option>
          {subjects.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="LMS 계정" value={account} onChange={(e) => setAccount(e.target.value as "" | "yes" | "no")} className={sel}>
          <option value="">LMS 계정 전체</option>
          <option value="yes">발급됨</option>
          <option value="no">미발급</option>
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="강사명 · 연락처 · 강좌명 검색"
          className={`${sel} ml-auto w-full max-w-[260px]`} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px]">
          <thead className="border-b border-grey-100">
            <tr className="text-left text-[12.5px] font-semibold text-grey-600">
              <th className="px-4 py-2.5">강사</th><th className="px-3 py-2.5">연락처</th><th className="px-3 py-2.5">과목</th>
              <th className="px-3 py-2.5">진행 강좌</th><th className="px-3 py-2.5">정산 법인</th>
              <th className="px-3 py-2.5 text-right">재원생</th><th className="px-3 py-2.5">상태</th><th className="px-4 py-2.5">LMS 계정</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-100 text-[13.5px]">
            {rows.map((t) => (
              <tr key={t.id} className="relative transition-colors hover:bg-grey-50">
                <td className="px-4 py-2.5">
                  <Link href={`/hq/teachers/${t.id}`} className="flex items-center gap-2.5 after:absolute after:inset-0">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ backgroundColor: t.accent }}>
                      {t.name.charAt(0)}
                    </span>
                    <span className="font-semibold text-grey-900">{t.name}</span>
                  </Link>
                </td>
                <td className="num px-3 text-grey-600">{t.phone ?? "—"}</td>
                <td className="px-3">
                  <div className="flex flex-wrap gap-1">{t.subjects.length ? t.subjects.map((s) => <Badge key={s}>{s}</Badge>) : <span className="text-grey-400">—</span>}</div>
                </td>
                <td className="max-w-[320px] px-3 py-2 text-[13px] text-grey-700">
                  {t.openClassCount ? (
                    <>
                      {t.openClasses.slice(0, 2).map((c) => <div key={c} className="truncate">{c}</div>)}
                      {t.openClassCount > 2 && <div className="text-[12px] text-grey-400">외 {t.openClassCount - 2}개</div>}
                    </>
                  ) : <span className="text-grey-400">—</span>}
                </td>
                <td className="px-3 text-grey-600">{t.corporation ?? "—"}</td>
                <td className="num px-3 text-right text-grey-700">{t.studentCount}</td>
                <td className="px-3"><Badge tone={t.employment === "재직" ? "green" : "grey"}>{t.employment}</Badge></td>
                <td className="px-4">
                  {t.owner ? <span className="truncate font-mono text-[12.5px] text-grey-700">{t.owner.email}</span> : <Badge tone="amber">미발급</Badge>}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={8} className="py-16 text-center text-grey-400">조건에 맞는 강사가 없어요</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-grey-100 px-4 py-2.5 text-[12.5px] text-grey-500">총 {rows.length}명</div>
    </div>
  );
}
