import Link from "next/link";
import type { Dashboard } from "@/lib/dashboard";
import type { SpaceDetail } from "@/lib/spaces";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

/* ── 파스텔 색상 토큰 ─────────────────────────────── */
type Tint = "violet" | "sky" | "rose" | "amber" | "emerald";
const TINT: Record<Tint, { soft: string; text: string; bar: string }> = {
  violet: { soft: "bg-violet-50", text: "text-violet-600", bar: "bg-violet-400" },
  sky: { soft: "bg-sky-50", text: "text-sky-600", bar: "bg-sky-400" },
  rose: { soft: "bg-rose-50", text: "text-rose-500", bar: "bg-rose-400" },
  amber: { soft: "bg-amber-50", text: "text-amber-600", bar: "bg-amber-400" },
  emerald: { soft: "bg-emerald-50", text: "text-emerald-600", bar: "bg-emerald-400" },
};
const cardBase =
  "rounded-2xl bg-white shadow-[0_1px_3px_rgba(30,34,51,0.04),0_8px_24px_-16px_rgba(30,34,51,0.12)] ring-1 ring-slate-900/[0.04]";

function SectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
      <span className="h-3.5 w-1 rounded-full" style={{ backgroundColor: accent }} />
      {children}
    </h2>
  );
}

const STATUS: Record<string, string> = {
  진행중: "bg-emerald-100 text-emerald-600",
  예정: "bg-slate-100 text-slate-400",
  완료: "bg-slate-100 text-slate-400",
  신청: "bg-amber-100 text-amber-600",
  승인: "bg-sky-100 text-sky-600",
};
function Badge({ label }: { label: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS[label] ?? STATUS["예정"]}`}>
      {label}
    </span>
  );
}

export function TeacherDashboard({
  space,
  slug,
  data,
}: {
  space: SpaceDetail;
  slug: string;
  data: Dashboard;
}) {
  const accent = space.accent_color;
  const initial = space.name.replace(/쌤$/, "").charAt(0) || space.name.charAt(0);
  const ongoing = data.todaySessions.filter((s) => s.status === "진행중").length;

  const kpis: { label: string; value: string; sub: string; tint: Tint }[] = [
    { label: "전체 수강생", value: `${data.studentCount}`, sub: "명", tint: "violet" },
    { label: "오늘 수업", value: `${ongoing}/${data.todaySessions.length}`, sub: "진행중", tint: "sky" },
    { label: "숙제 미제출", value: `${data.missingHomework.length}`, sub: "명", tint: "rose" },
    { label: "승인 대기", value: `${data.approvals.length}`, sub: "건", tint: "amber" },
  ];
  const gradeTints: Tint[] = ["rose", "amber", "sky", "emerald", "violet"];

  return (
    <div className="flex min-h-dvh bg-slate-50 text-slate-800">
      <AdminSidebar spaceName={space.name} subject={space.subject} accent={accent} initial={initial} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── 상단바 ── */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/[0.06] bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            {/* 모바일에서 사이드바 대신 쌤 표시 */}
            <div
              className="flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white md:hidden"
              style={{ background: `linear-gradient(145deg, ${accent}, ${accent}bb)` }}
            >
              {initial}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">대시보드</h1>
              <p className="text-xs text-slate-400">학원 운영 현황을 한눈에 확인하세요</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline-flex">
              📅 2026년 7월
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">실장</span>
            <Link
              href={`/s/${slug}/student`}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              학생 앱 보기 →
            </Link>
          </div>
        </header>

        {/* ── 콘텐츠 ── */}
        <main className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className={`${cardBase} p-4`}>
                <div className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${TINT[k.tint].soft} ${TINT[k.tint].text}`}>
                  {k.label}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-extrabold tracking-tight ${TINT[k.tint].text}`}>{k.value}</span>
                  <span className="text-xs text-slate-400">{k.sub}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* 오늘 수업 */}
            <div className={`${cardBase} p-5`}>
              <SectionTitle accent={accent}>오늘 수업 현황</SectionTitle>
              <ul className="space-y-1.5">
                {data.todaySessions.map((s, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-11 text-sm font-bold tabular-nums" style={{ color: accent }}>{s.time}</span>
                      <span className="text-sm font-medium text-slate-700">{s.title}</span>
                    </div>
                    <Badge label={s.status} />
                  </li>
                ))}
              </ul>
            </div>

            {/* 숙제 미제출 */}
            <div className={`${cardBase} p-5`}>
              <SectionTitle accent={accent}>
                지난주 숙제 미제출
                <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-500">
                  {data.missingHomework.length}명
                </span>
              </SectionTitle>
              <ul className="space-y-0.5">
                {data.missingHomework.map((h, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl px-2 py-2.5 hover:bg-slate-50">
                    <div>
                      <div className="text-sm font-semibold text-slate-700">{h.student}</div>
                      <div className="text-xs text-slate-400">{h.assignment}</div>
                    </div>
                    <span className="rounded-full bg-gradient-to-r from-rose-400 to-rose-500 px-2.5 py-1 text-[11px] font-bold text-white">
                      D+{h.daysLate}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 성적 요약 */}
          <div className={`${cardBase} p-5`}>
            <SectionTitle accent={accent}>성적 요약 · 반 평균</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              {data.gradeSummary.map((g, i) => {
                const t = TINT[gradeTints[i % gradeTints.length]];
                return (
                  <div key={i} className={`rounded-xl ${t.soft} p-4`}>
                    <div className={`text-[11px] font-bold ${t.text}`}>{g.label}</div>
                    <div className="mt-1 flex items-baseline gap-0.5">
                      <span className="text-3xl font-extrabold text-slate-800">{g.value}</span>
                      <span className="text-sm font-medium text-slate-400">{g.unit}</span>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/80">
                      <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(g.value, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 승인 대기 + 클리닉 + 공지 */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* 예약/계정 승인 대기 */}
            <div className={`${cardBase} p-5`}>
              <SectionTitle accent={accent}>
                예약·계정 승인 대기
                <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                  {data.approvals.length}
                </span>
              </SectionTitle>
              <ul className="space-y-1.5">
                {data.approvals.map((a, i) => (
                  <li key={i} className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{a.student}</span>
                      <span className="text-[11px] text-slate-400">{a.at}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">{a.info}</div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 클리닉 */}
            <div className={`${cardBase} p-5`}>
              <SectionTitle accent={accent}>클리닉 신청 현황</SectionTitle>
              <ul className="space-y-0.5">
                {data.clinics.map((c, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl px-2 py-2.5 hover:bg-slate-50">
                    <div>
                      <div className="text-sm font-semibold text-slate-700">{c.student}</div>
                      <div className="text-xs text-slate-400">{c.reason}</div>
                    </div>
                    <Badge label={c.status} />
                  </li>
                ))}
              </ul>
            </div>

            {/* 공지 */}
            <div className={`${cardBase} p-5`}>
              <SectionTitle accent={accent}>공지사항</SectionTitle>
              <ul className="space-y-0.5">
                {data.notices.map((n, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50">
                    <span className="flex items-center gap-2 truncate text-sm text-slate-600">
                      <span className="text-xs">📌</span>
                      <span className="truncate">{n.title}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-400">{n.date}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
