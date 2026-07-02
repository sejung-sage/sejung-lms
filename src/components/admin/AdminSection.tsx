import { Card, Badge, cardBase, ComingSoon } from "./ui";
import type { NavKey } from "./AdminSidebar";
import {
  mockStudents, mockAttendance, mockHomework, mockGrades, mockApprovals,
} from "@/lib/mock/admin";

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}
function Td({ children, right, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={`px-3 py-3 text-sm ${right ? "text-right" : "text-left"} ${className}`}>{children}</td>;
}

function Stat({ label, value, tint }: { label: string; value: number | string; tint: string }) {
  return (
    <div className={`${cardBase} px-4 py-3`}>
      <div className="text-[11px] font-semibold text-slate-400">{label}</div>
      <div className={`mt-0.5 text-2xl font-extrabold ${tint}`}>{value}</div>
    </div>
  );
}

function MiniBar({ value, accent }: { value: number; accent: string }) {
  return (
    <div className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: accent }} />
    </div>
  );
}

export function AdminSection({
  section, subject, accent,
}: {
  section: Exclude<NavKey, "dash">;
  subject: string;
  accent: string;
}) {
  /* ── 학생 목록 ── */
  if (section === "students") {
    const rows = mockStudents(subject);
    return (
      <>
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">전체 <b className="text-slate-700">{rows.length}</b>명</div>
          <div className="rounded-full bg-white px-3 py-1.5 text-xs text-slate-400 shadow-sm ring-1 ring-slate-900/5">🔍 이름·학교 검색</div>
        </div>
        <div className={`${cardBase} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-slate-100">
                <tr><Th>이름</Th><Th>학교/학년</Th><Th>반</Th><Th right>출석률</Th><Th right>숙제율</Th><Th right>상태</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((s) => (
                  <tr key={s.name} className="hover:bg-slate-50/60">
                    <Td className="font-semibold text-slate-800">{s.name}</Td>
                    <Td className="text-slate-500">{s.school} · {s.grade}</Td>
                    <Td className="text-slate-500">{s.className}</Td>
                    <Td right><div className="flex items-center gap-2"><span className="tabular-nums text-slate-600">{s.attendanceRate}%</span><MiniBar value={s.attendanceRate} accent={accent} /></div></Td>
                    <Td right><span className="tabular-nums text-slate-600">{s.hwRate}%</span></Td>
                    <Td right><Badge label={s.status === "재원" ? "출석" : "대기"} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  /* ── 출석 관리 ── */
  if (section === "attendance") {
    const { session, rows } = mockAttendance(subject);
    const count = (st: string) => rows.filter((r) => r.status === st).length;
    return (
      <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="출석" value={count("출석")} tint="text-emerald-600" />
          <Stat label="지각" value={count("지각")} tint="text-amber-600" />
          <Stat label="결석" value={count("결석")} tint="text-rose-500" />
          <Stat label="미등원" value={count("예정")} tint="text-slate-400" />
        </div>
        <div className={`${cardBase} overflow-hidden`}>
          <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
            {session} <span className="ml-1 text-xs font-normal text-slate-400">· 등원 QR 스캔</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead className="border-b border-slate-100"><tr><Th>이름</Th><Th>등원 시각</Th><Th right>상태</Th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r) => (
                  <tr key={r.name} className="hover:bg-slate-50/60">
                    <Td className="font-semibold text-slate-800">{r.name}</Td>
                    <Td className="tabular-nums text-slate-500">{r.time}</Td>
                    <Td right><Badge label={r.status === "예정" ? "예정" : r.status} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  /* ── 숙제 관리 ── */
  if (section === "homework") {
    const { title, due, rows } = mockHomework(subject);
    const submitted = rows.filter((r) => r.status !== "미제출").length;
    const rate = Math.round((submitted / rows.length) * 100);
    return (
      <>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-slate-800">{title}</div>
              <div className="text-xs text-slate-400">마감 {due}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold" style={{ color: accent }}>{rate}%</div>
              <div className="text-[11px] text-slate-400">{submitted}/{rows.length} 제출</div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: accent }} />
          </div>
        </Card>
        <div className={`${cardBase} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead className="border-b border-slate-100"><tr><Th>이름</Th><Th>제출 시각</Th><Th right>상태</Th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r) => (
                  <tr key={r.name} className="hover:bg-slate-50/60">
                    <Td className="font-semibold text-slate-800">{r.name}</Td>
                    <Td className="tabular-nums text-slate-500">{r.at}</Td>
                    <Td right><Badge label={r.status} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  /* ── 성적 ── */
  if (section === "grades") {
    const { columns, rows } = mockGrades(subject);
    return (
      <div className={`${cardBase} overflow-hidden`}>
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
          7회차 주간 성적
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="border-b border-slate-100">
              <tr><Th>이름</Th>{columns.map((c) => <Th key={c} right>{c}</Th>)}<Th right>평균</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => (
                <tr key={r.name} className="hover:bg-slate-50/60">
                  <Td className="font-semibold text-slate-800">{r.name}</Td>
                  {r.scores.map((s, i) => <Td key={i} right className="tabular-nums text-slate-600">{s}</Td>)}
                  <Td right><span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: accent }}>{r.avg}</span></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── 계정 승인 ── */
  if (section === "approvals") {
    const rows = mockApprovals();
    return (
      <div className="space-y-3">
        {rows.map((a, i) => (
          <div key={i} className={`${cardBase} flex flex-wrap items-center justify-between gap-3 p-4`}>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                {a.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{a.name}</span>
                  <Badge label="대기" />
                </div>
                <div className="text-xs text-slate-400">{a.type} · {a.detail} · {a.at}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-sm" style={{ backgroundColor: accent }}>승인</button>
              <button className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-500">거절</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ── 보강 / 영상 : 준비중 ── */
  return <ComingSoon title={section === "makeup" ? "보강 관리" : "영상 관리"} />;
}
