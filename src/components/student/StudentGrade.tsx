import type { SpaceDetail } from "@/lib/spaces";
import type { StudentGrade as StudentGradeData } from "@/lib/student";
import { StudentFrame } from "./StudentFrame";
import { LineChart, Donut } from "./charts";
import { Card, Badge } from "@/components/ui/Card";
import { ChipTabs } from "@/components/ui/Tabs";
import { OmrEntry } from "@/components/omr/OmrEntry";

export function StudentGrade({
  space, slug, data, preview, courses, active,
}: {
  space: SpaceDetail; slug: string; data: StudentGradeData; preview?: boolean;
  /** 내가 듣는 강좌 — 강좌별로 성적을 나눠 본다 (섞으면 추이가 거짓말을 한다) */
  courses: { id: string; title: string }[]; active: string | null;
}) {
  return (
    <StudentFrame space={space} slug={slug} active="grade" pageLabel="성적" preview={preview}>
      {courses.length > 0 && (
        <ChipTabs
          className="mt-1"
          active={active ?? ""}
          items={courses.map((c) => ({ key: c.id, label: c.title, href: `/s/${slug}/student/grade?class=${c.id}` }))}
        />
      )}

      <OmrEntry slug={slug} classId={active ?? undefined} />

      {/* 주간보고서 */}
      <h3 className="px-1 pb-1 pt-3 text-[17px] font-bold text-grey-900">주간보고서</h3>
      <div className="grid grid-cols-2 gap-3">
        {data.weekly.map((w, i) => (
          <Card key={i} className="p-4">
            <div className="text-[13px] font-medium text-grey-600">{w.label}</div>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="num text-[26px] font-bold tracking-[-0.03em] text-grey-900">{w.score}</span>
              <span className="text-[13px] text-grey-500">점</span>
            </div>
            <Badge tone="blue" className="mt-2">상위 {w.percentile}%</Badge>
          </Card>
        ))}
      </div>

      {/* 시험 결과 추이 */}
      <h3 className="px-1 pb-1 pt-3 text-[17px] font-bold text-grey-900">시험 결과</h3>
      <Card>
        <div className="mb-2 text-[13px] text-grey-500">회차별 점수 추이</div>
        <LineChart points={data.examTrend.points} labels={data.examTrend.labels} />
      </Card>

      {/* 진행 현황 */}
      <h3 className="px-1 pb-1 pt-3 text-[17px] font-bold text-grey-900">진행 현황</h3>
      <Card>
        <div className="flex items-center gap-6">
          <Donut value={data.progress.percent} />
          <dl className="space-y-2 text-[14px]">
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-blue-500" />
              <span className="text-grey-700">현재 {data.progress.current}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-grey-300" />
              <span className="text-grey-500">미완성 {data.progress.incomplete}</span>
            </div>
          </dl>
        </div>
      </Card>
    </StudentFrame>
  );
}
