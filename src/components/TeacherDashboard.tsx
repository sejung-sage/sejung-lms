import type { Dashboard } from "@/lib/dashboard";
import type { SpaceDetail } from "@/lib/spaces";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, SectionTitle, Badge, TINT, cardBase, type Tint } from "@/components/admin/ui";

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
  const ongoing = data.todaySessions.filter((s) => s.status === "진행중").length;

  const kpis: { label: string; value: string; sub: string; tint: Tint }[] = [
    { label: "전체 수강생", value: `${data.studentCount}`, sub: "명", tint: "violet" },
    { label: "오늘 수업", value: `${ongoing}/${data.todaySessions.length}`, sub: "진행중", tint: "sky" },
    { label: "숙제 미제출", value: `${data.missingHomework.length}`, sub: "명", tint: "rose" },
    { label: "승인 대기", value: `${data.approvals.length}`, sub: "건", tint: "amber" },
  ];
  const gradeTints: Tint[] = ["rose", "amber", "sky", "emerald", "violet"];

  return (
    <AdminShell space={space} slug={slug} active="dash" title="대시보드" subtitle="학원 운영 현황을 한눈에 확인하세요">
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
        <Card>
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
        </Card>

        {/* 숙제 미제출 */}
        <Card>
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
        </Card>
      </div>

      {/* 성적 요약 */}
      <Card>
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
      </Card>

      {/* 승인 대기 + 클리닉 + 공지 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <SectionTitle accent={accent}>
            예약·계정 승인 대기
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-600">{data.approvals.length}</span>
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
        </Card>

        <Card>
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
        </Card>

        <Card>
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
        </Card>
      </div>
    </AdminShell>
  );
}
