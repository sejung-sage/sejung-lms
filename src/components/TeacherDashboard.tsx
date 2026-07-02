import Link from "next/link";
import type { Dashboard } from "@/lib/dashboard";
import type { SpaceDetail } from "@/lib/spaces";

/* ── 파스텔 색상 토큰 ─────────────────────────────── */
type Tint = "violet" | "sky" | "rose" | "amber" | "emerald";
const TINT: Record<Tint, { soft: string; text: string; bar: string }> = {
  violet: { soft: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-600 dark:text-violet-300", bar: "bg-violet-400" },
  sky: { soft: "bg-sky-50 dark:bg-sky-500/10", text: "text-sky-600 dark:text-sky-300", bar: "bg-sky-400" },
  rose: { soft: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-500 dark:text-rose-300", bar: "bg-rose-400" },
  amber: { soft: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-300", bar: "bg-amber-400" },
  emerald: { soft: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-300", bar: "bg-emerald-400" },
};
const cardBase =
  "rounded-3xl bg-white/90 shadow-[0_8px_30px_-12px_rgba(60,50,120,0.15)] ring-1 ring-black/[0.04] backdrop-blur dark:bg-zinc-900/70 dark:ring-white/[0.06]";

function SectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">
      <span className="h-3.5 w-1 rounded-full" style={{ backgroundColor: accent }} />
      {children}
    </h2>
  );
}

const STATUS: Record<string, string> = {
  진행중: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  예정: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-400",
  완료: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
  신청: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  승인: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
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
  const clinicRequests = data.clinics.filter((c) => c.status === "신청").length;

  const kpis: { label: string; value: string; sub: string; tint: Tint }[] = [
    { label: "수강생", value: `${data.studentCount}`, sub: "명", tint: "violet" },
    { label: "오늘 수업", value: `${ongoing}/${data.todaySessions.length}`, sub: "진행중", tint: "sky" },
    { label: "숙제 미제출", value: `${data.missingHomework.length}`, sub: "명", tint: "rose" },
    { label: "클리닉 신청", value: `${clinicRequests}`, sub: "대기", tint: "amber" },
  ];
  const gradeTints: Tint[] = ["rose", "amber", "sky", "emerald", "violet"];

  return (
    <div className="flex flex-1 flex-col bg-[#F6F5FB] dark:bg-black">
      {/* ── 그라데이션 히어로 헤더 ── */}
      <header
        className="relative overflow-hidden rounded-b-[2rem] px-5 pb-10 pt-8 text-white"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 55%, ${accent}99 100%)` }}
      >
        {/* 은은한 광택 */}
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <Link href="/" className="text-sm text-white/80 transition hover:text-white">
            ← 세정학원
          </Link>
          <Link
            href={`/s/${slug}/student`}
            className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur transition hover:bg-white/30"
          >
            학생 앱 보기 →
          </Link>
        </div>
        <div className="relative mt-4 flex items-center gap-3.5">
          <div className="flex size-14 items-center justify-center rounded-[26%] bg-white/25 text-2xl font-bold shadow-inner ring-1 ring-white/30 backdrop-blur">
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{space.name}</h1>
              <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur">
                관리자
              </span>
            </div>
            {space.subject && <p className="mt-0.5 text-sm text-white/85">{space.subject} · 대시보드</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-6 w-full max-w-3xl flex-1 space-y-4 px-4 pb-12">
        {/* ── KPI ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className={`${cardBase} p-4`}>
              <div className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${TINT[k.tint].soft} ${TINT[k.tint].text}`}>
                {k.label}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-extrabold tracking-tight ${TINT[k.tint].text}`}>{k.value}</span>
                <span className="text-xs text-zinc-400">{k.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── 오늘 수업 ── */}
        <div className={`${cardBase} p-5`}>
          <SectionTitle accent={accent}>오늘 수업 현황</SectionTitle>
          <ul className="space-y-1.5">
            {data.todaySessions.map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-2xl bg-zinc-50/80 px-3.5 py-3 dark:bg-zinc-800/40"
              >
                <div className="flex items-center gap-3">
                  <span className="w-11 text-sm font-bold tabular-nums" style={{ color: accent }}>
                    {s.time}
                  </span>
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{s.title}</span>
                </div>
                <Badge label={s.status} />
              </li>
            ))}
          </ul>
        </div>

        {/* ── 숙제 미제출 ── */}
        <div className={`${cardBase} p-5`}>
          <SectionTitle accent={accent}>
            지난주 숙제 미제출
            <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-500 dark:bg-rose-500/15 dark:text-rose-300">
              {data.missingHomework.length}
            </span>
          </SectionTitle>
          <ul className="space-y-1.5">
            {data.missingHomework.map((h, i) => (
              <li key={i} className="flex items-center justify-between rounded-2xl px-3.5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                <div>
                  <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{h.student}</div>
                  <div className="text-xs text-zinc-400">{h.assignment}</div>
                </div>
                <span className="rounded-full bg-gradient-to-r from-rose-400 to-rose-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                  D+{h.daysLate}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── 성적 요약 (파스텔 색상 카드) ── */}
        <div className={`${cardBase} p-5`}>
          <SectionTitle accent={accent}>성적 요약 · 반 평균</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.gradeSummary.map((g, i) => {
              const t = TINT[gradeTints[i % gradeTints.length]];
              return (
                <div key={i} className={`rounded-2xl ${t.soft} p-4`}>
                  <div className={`text-[11px] font-bold ${t.text}`}>{g.label}</div>
                  <div className="mt-1 flex items-baseline gap-0.5">
                    <span className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-50">{g.value}</span>
                    <span className="text-sm font-medium text-zinc-400">{g.unit}</span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/70 dark:bg-white/10">
                    <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(g.value, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 클리닉 + 공지 ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`${cardBase} p-5`}>
            <SectionTitle accent={accent}>클리닉 신청 현황</SectionTitle>
            <ul className="space-y-1.5">
              {data.clinics.map((c, i) => (
                <li key={i} className="flex items-center justify-between rounded-2xl px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <div>
                    <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{c.student}</div>
                    <div className="text-xs text-zinc-400">{c.reason}</div>
                  </div>
                  <Badge label={c.status} />
                </li>
              ))}
            </ul>
          </div>

          <div className={`${cardBase} p-5`}>
            <SectionTitle accent={accent}>공지사항</SectionTitle>
            <ul className="space-y-1">
              {data.notices.map((n, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <span className="flex items-center gap-2 truncate text-sm text-zinc-700 dark:text-zinc-200">
                    <span className="text-xs">📌</span>
                    <span className="truncate">{n.title}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-zinc-400">{n.date}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
