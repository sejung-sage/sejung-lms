import { Card, Badge, cardBase, ComingSoon } from "./ui";
import { ProgressBar } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChipTabs } from "@/components/ui/Tabs";
import type { NavKey } from "./AdminSidebar";
import {
  mockStudents, mockAttendance, mockHomework, mockGrades, mockApprovals,
} from "@/lib/mock/admin";

/* ── 토스식 테이블 프리미티브 ──────────────────────
   헤더는 대문자 트래킹 대신 얌전한 회색 소문자.
   구분선은 grey-100 1px, hover 는 grey-50. */

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-[13px] font-medium text-grey-500 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
function Td({
  children,
  right,
  className = "",
}: {
  children: React.ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-3.5 text-[15px] ${right ? "text-right" : "text-left"} ${className}`}
    >
      {children}
    </td>
  );
}
function TableCard({ title, sub, children }: { title?: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className={`${cardBase} overflow-hidden`}>
      {title && (
        <div className="flex items-center gap-2 border-b border-grey-100 px-5 py-4">
          <span className="text-[15px] font-bold text-grey-900">{title}</span>
          {sub && <span className="text-[13px] text-grey-500">{sub}</span>}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function Stat({ label, value, tint }: { label: string; value: number | string; tint: string }) {
  return (
    <div className={`${cardBase} p-5`}>
      <div className="text-[13px] font-medium text-grey-600">{label}</div>
      <div className={`num mt-1 text-[26px] font-bold tracking-[-0.03em] ${tint}`}>{value}</div>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ChipTabs
            active="all"
            items={[
              { key: "all", label: `전체 ${rows.length}` },
              { key: "active", label: "재원" },
              { key: "rest", label: "휴원" },
            ]}
          />
          <div className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-white px-3 text-[14px] text-grey-400 ring-1 ring-grey-200">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            이름·학교 검색
          </div>
        </div>

        <TableCard>
          <table className="w-full min-w-[680px]">
            <thead className="border-b border-grey-100">
              <tr><Th>이름</Th><Th>학교/학년</Th><Th>반</Th><Th right>출석률</Th><Th right>숙제율</Th><Th right>상태</Th></tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {rows.map((s) => (
                <tr key={s.name} className="transition-colors hover:bg-grey-50">
                  <Td className="font-semibold text-grey-900">{s.name}</Td>
                  <Td className="text-grey-600">{s.school} · {s.grade}</Td>
                  <Td className="text-grey-600">{s.className}</Td>
                  <Td right>
                    <div className="flex items-center justify-end gap-2.5">
                      <span className="num text-grey-700">{s.attendanceRate}%</span>
                      <ProgressBar value={s.attendanceRate} className="w-16" />
                    </div>
                  </Td>
                  <Td right className="num text-grey-700">{s.hwRate}%</Td>
                  <Td right><Badge label={s.status === "재원" ? "출석" : "대기"} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
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
          <Stat label="출석" value={count("출석")} tint="text-green-600" />
          <Stat label="지각" value={count("지각")} tint="text-yellow-600" />
          <Stat label="결석" value={count("결석")} tint="text-red-500" />
          <Stat label="미등원" value={count("예정")} tint="text-grey-400" />
        </div>

        <TableCard title={session} sub="· 등원 QR 스캔">
          <table className="w-full min-w-[480px]">
            <thead className="border-b border-grey-100"><tr><Th>이름</Th><Th>등원 시각</Th><Th right>상태</Th></tr></thead>
            <tbody className="divide-y divide-grey-100">
              {rows.map((r) => (
                <tr key={r.name} className="transition-colors hover:bg-grey-50">
                  <Td className="font-semibold text-grey-900">{r.name}</Td>
                  <Td className="num text-grey-600">{r.time}</Td>
                  <Td right><Badge label={r.status === "예정" ? "예정" : r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
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
              <div className="text-[16px] font-bold text-grey-900">{title}</div>
              <div className="text-[13px] text-grey-500">마감 {due}</div>
            </div>
            <div className="text-right">
              <div className="num text-[26px] font-bold tracking-[-0.03em] text-blue-500">{rate}%</div>
              <div className="num text-[13px] text-grey-500">{submitted}/{rows.length} 제출</div>
            </div>
          </div>
          <ProgressBar value={rate} className="mt-4 h-2" />
        </Card>

        <TableCard>
          <table className="w-full min-w-[480px]">
            <thead className="border-b border-grey-100"><tr><Th>이름</Th><Th>제출 시각</Th><Th right>상태</Th></tr></thead>
            <tbody className="divide-y divide-grey-100">
              {rows.map((r) => (
                <tr key={r.name} className="transition-colors hover:bg-grey-50">
                  <Td className="font-semibold text-grey-900">{r.name}</Td>
                  <Td className="num text-grey-600">{r.at}</Td>
                  <Td right><Badge label={r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </>
    );
  }

  /* ── 성적 ── */
  if (section === "grades") {
    const { columns, rows } = mockGrades(subject);
    return (
      <TableCard title="7회차 주간 성적">
        <table className="w-full min-w-[560px]">
          <thead className="border-b border-grey-100">
            <tr><Th>이름</Th>{columns.map((c) => <Th key={c} right>{c}</Th>)}<Th right>평균</Th></tr>
          </thead>
          <tbody className="divide-y divide-grey-100">
            {rows.map((r) => (
              <tr key={r.name} className="transition-colors hover:bg-grey-50">
                <Td className="font-semibold text-grey-900">{r.name}</Td>
                {r.scores.map((s, i) => <Td key={i} right className="num text-grey-700">{s}</Td>)}
                <Td right>
                  <span className="num rounded-[6px] bg-blue-100 px-2 py-1 text-[13px] font-bold text-blue-600">
                    {r.avg}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
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
              <div
                className="flex size-11 items-center justify-center rounded-full text-[15px] font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {a.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-grey-900">{a.name}</span>
                  <Badge label="대기" />
                </div>
                <div className="text-[13px] text-grey-500">{a.type} · {a.detail} · {a.at}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm">승인</Button>
              <Button variant="secondary" size="sm">거절</Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ── 보강 / 영상 : 준비중 ── */
  return <ComingSoon title={section === "makeup" ? "보강 관리" : "영상 관리"} />;
}
