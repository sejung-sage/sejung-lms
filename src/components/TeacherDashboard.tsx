import type { Dashboard } from "@/lib/dashboard";
import type { SpaceDetail } from "@/lib/spaces";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, SectionTitle, Badge, cardBase } from "@/components/admin/ui";
import { ProgressBar, TONE, type Tone } from "@/components/ui/Card";

export function TeacherDashboard({
  space,
  slug,
  data,
}: {
  space: SpaceDetail;
  slug: string;
  data: Dashboard;
}) {
  const ongoing = data.todaySessions.filter((s) => s.status === "진행중").length;

  /* 토스는 숫자를 다 칠하지 않는다. 기본은 grey-900,
     "지금 손봐야 하는 것"에만 색을 넣는다. */
  const kpis: { label: string; value: string; sub: string; tone?: Tone }[] = [
    { label: "전체 수강생", value: `${data.studentCount}`, sub: "명" },
    { label: "오늘 수업", value: `${ongoing}/${data.todaySessions.length}`, sub: "진행중" },
    { label: "숙제 미제출", value: `${data.missingHomework.length}`, sub: "명", tone: "red" },
    { label: "승인 대기", value: `${data.approvals.length}`, sub: "건", tone: "yellow" },
  ];

  return (
    <AdminShell
      space={space}
      slug={slug}
      active="dash"
      title="대시보드"
      subtitle="학원 운영 현황을 한눈에 확인하세요"
    >
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${cardBase} p-5`}>
            <div className="text-[13px] font-medium text-grey-600">{k.label}</div>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span
                className={`num text-[28px] font-bold tracking-[-0.03em] ${
                  k.tone ? TONE[k.tone].text : "text-grey-900"
                }`}
              >
                {k.value}
              </span>
              <span className="text-[14px] text-grey-500">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 오늘 수업 */}
        <Card>
          <SectionTitle>오늘 수업 현황</SectionTitle>
          <ul className="divide-y divide-grey-100">
            {data.todaySessions.map((s, i) => (
              <li key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="num w-12 text-[14px] font-semibold text-grey-500">{s.time}</span>
                  <span className="text-[15px] font-medium text-grey-800">{s.title}</span>
                </div>
                <Badge label={s.status} />
              </li>
            ))}
          </ul>
        </Card>

        {/* 숙제 미제출 */}
        <Card>
          <SectionTitle right={`${data.missingHomework.length}명`}>지난주 숙제 미제출</SectionTitle>
          <ul className="divide-y divide-grey-100">
            {data.missingHomework.map((h, i) => (
              <li key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="text-[15px] font-semibold text-grey-800">{h.student}</div>
                  <div className="text-[13px] text-grey-500">{h.assignment}</div>
                </div>
                <span className="num rounded-[6px] bg-red-100 px-2 py-1 text-[12px] font-semibold text-red-500">
                  D+{h.daysLate}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* 성적 요약 */}
      <Card>
        <SectionTitle>성적 요약 · 반 평균</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.gradeSummary.map((g, i) => (
            <div key={i} className="rounded-btn bg-grey-50 p-4">
              <div className="text-[13px] font-medium text-grey-600">{g.label}</div>
              <div className="mt-1 flex items-baseline gap-0.5">
                <span className="num text-[26px] font-bold tracking-[-0.03em] text-grey-900">
                  {g.value}
                </span>
                <span className="text-[14px] font-medium text-grey-500">{g.unit}</span>
              </div>
              <ProgressBar value={g.value} className="mt-3 bg-grey-200" />
            </div>
          ))}
        </div>
      </Card>

      {/* 승인 대기 + 클리닉 + 공지 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <SectionTitle right={`${data.approvals.length}건`}>예약·계정 승인 대기</SectionTitle>
          <ul className="divide-y divide-grey-100">
            {data.approvals.map((a, i) => (
              <li key={i} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold text-grey-800">{a.student}</span>
                  <span className="num text-[12px] text-grey-400">{a.at}</span>
                </div>
                <div className="mt-0.5 text-[13px] text-grey-500">{a.info}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle>클리닉 신청 현황</SectionTitle>
          <ul className="divide-y divide-grey-100">
            {data.clinics.map((c, i) => (
              <li key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="text-[15px] font-semibold text-grey-800">{c.student}</div>
                  <div className="text-[13px] text-grey-500">{c.reason}</div>
                </div>
                <Badge label={c.status} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle>공지사항</SectionTitle>
          <ul className="divide-y divide-grey-100">
            {data.notices.map((n, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="truncate text-[15px] text-grey-700">{n.title}</span>
                <span className="num shrink-0 text-[12px] text-grey-400">{n.date}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AdminShell>
  );
}
