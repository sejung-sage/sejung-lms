import { Card, Badge, cardBase, ComingSoon } from "./ui";
import { ProgressBar } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PillTabs } from "@/components/ui/Tabs";
import type { NavKey } from "./AdminSidebar";
import type { SpaceDetail } from "@/lib/spaces";
import {
  getAdminStudents, getAdminAttendance, getAdminHomework, getAdminGrades, getAdminApprovals,
  getAdminTodos, getAdminClinicReservations,
} from "@/lib/admin";

/* ── 토스식 테이블 프리미티브 ──────────────────────
   헤더는 대문자 트래킹 대신 얌전한 회색 소문자.
   구분선은 grey-100 1px, hover 는 grey-50. */

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`whitespace-nowrap px-3 py-2.5 text-[12.5px] font-semibold text-grey-600 ${
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
      className={`h-11 px-3 text-[13.5px] ${right ? "text-right" : "text-left"} ${className}`}
    >
      {children}
    </td>
  );
}
function TableCard({ title, sub, children }: { title?: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className={`${cardBase} overflow-hidden`}>
      {title && (
        <div className="flex items-center gap-2 border-b border-grey-200 px-4 py-3">
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

/** 표가 비었을 때 — 실 DB 에서는 '아직 없음'이 정상 상태다 */
function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${cardBase} py-16 text-center text-[13.5px] text-grey-400`}>{children}</div>
  );
}

export async function AdminSection({
  section, space,
}: {
  section: Exclude<NavKey, "dash">;
  space: SpaceDetail;
}) {
  const accent = space.accent_color;
  /* ── 학생 목록 ── */
  if (section === "students") {
    const rows = await getAdminStudents(space);
    if (!rows.length) return <EmptyCard>등록된 수강생이 없어요</EmptyCard>;
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillTabs
            active="all"
            items={[
              { key: "all", label: "전체", count: rows.length },
              { key: "active", label: "재원", count: rows.filter((r) => r.status !== "휴원").length },
              { key: "rest", label: "휴원", count: rows.filter((r) => r.status === "휴원").length },
            ]}
          />
          <div className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-white px-3 text-[13.5px] text-grey-400 ring-1 ring-grey-200">
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
    const { session, rows } = await getAdminAttendance(space);
    if (!rows.length) return <EmptyCard>출결 기록이 있는 차시가 없어요</EmptyCard>;
    const count = (st: string) => rows.filter((r) => r.status === st).length;
    return (
      <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="출석" value={count("출석")} tint="text-green-600" />
          <Stat label="지각" value={count("지각")} tint="text-amber-500" />
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
    const { title, due, rows } = await getAdminHomework(space);
    if (!rows.length) return <EmptyCard>등록된 과제가 없어요</EmptyCard>;
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

  /* ── 할 일 관리 ── */
  if (section === "todos") {
    const rows = await getAdminTodos(space);
    if (!rows.length) return <EmptyCard>미완료 할 일이 없어요</EmptyCard>;
    const open = rows.filter((r) => r.state === "미완료");
    const retakes = open.filter((r) => r.kind === "재시험").length;
    const clinic = open.filter((r) => r.kind === "클리닉 예약").length;
    return (
      <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="미완료" value={open.length} tint="text-red-500" />
          <Stat label="재시험" value={retakes} tint="text-amber-500" />
          <Stat label="클리닉 예약" value={clinic} tint="text-blue-500" />
          <Stat label="완료/면제" value={rows.length - open.length} tint="text-grey-500" />
        </div>

        <TableCard title="자동 연쇄 할 일" sub="· 커트라인 미달/제출 누락">
          <table className="w-full min-w-[680px]">
            <thead className="border-b border-grey-100">
              <tr><Th>학생</Th><Th>구분</Th><Th>내용</Th><Th>마감</Th><Th right>상태</Th></tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {rows.map((r, i) => (
                <tr key={`${r.name}-${r.title}-${i}`} className="transition-colors hover:bg-grey-50">
                  <Td className="font-semibold text-grey-900">{r.name}</Td>
                  <Td className="text-grey-600">{r.kind}</Td>
                  <Td className="text-grey-700">{r.title}</Td>
                  <Td className="num text-grey-600">{r.due}</Td>
                  <Td right><Badge label={r.state} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </>
    );
  }

  /* ── 클리닉 예약 ── */
  if (section === "clinic") {
    const rows = await getAdminClinicReservations(space);
    if (!rows.length) return <EmptyCard>클리닉 예약이 없어요</EmptyCard>;
    const count = (st: string) => rows.filter((r) => r.status === st).length;
    return (
      <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="예약" value={count("예약")} tint="text-blue-500" />
          <Stat label="등원" value={count("등원")} tint="text-green-600" />
          <Stat label="하원" value={count("하원")} tint="text-grey-700" />
          <Stat label="미등원" value={count("미등원")} tint="text-red-500" />
        </div>

        <TableCard title="예약·등하원 현황" sub="· 조교 피드백 포함">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-grey-100">
              <tr><Th>학생</Th><Th>클리닉</Th><Th>시간</Th><Th>피드백</Th><Th right>상태</Th></tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {rows.map((r, i) => (
                <tr key={`${r.name}-${r.time}-${i}`} className="transition-colors hover:bg-grey-50">
                  <Td className="font-semibold text-grey-900">{r.name}</Td>
                  <Td className="text-grey-700">{r.session}</Td>
                  <Td className="num text-grey-600">{r.time}</Td>
                  <Td className="max-w-[280px] truncate text-grey-600">{r.feedback}</Td>
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
    const { columns, rows } = await getAdminGrades(space);
    if (!columns.length) return <EmptyCard>채점된 시험이 없어요</EmptyCard>;
    return (
      <TableCard title="최근 시험 성적" sub="· 100점 환산">
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
    const rows = await getAdminApprovals(space);
    if (!rows.length) return <EmptyCard>대기 중인 승인 요청이 없어요</EmptyCard>;
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
