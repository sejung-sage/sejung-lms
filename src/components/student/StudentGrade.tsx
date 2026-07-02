import type { SpaceDetail } from "@/lib/spaces";
import type { StudentGrade as StudentGradeData } from "@/lib/student";
import { StudentFrame } from "./StudentFrame";
import { LineChart, Donut } from "./charts";

const card = "rounded-3xl bg-white/90 shadow-[0_8px_30px_-14px_rgba(60,50,120,0.18)] ring-1 ring-black/[0.04]";

export function StudentGrade({ space, slug, data }: { space: SpaceDetail; slug: string; data: StudentGradeData }) {
  const accent = space.accent_color;

  return (
    <StudentFrame space={space} slug={slug} active="grade" pageLabel="성적">
      {/* 주간보고서 */}
      <div>
        <h3 className="mb-2 px-1 text-sm font-bold text-slate-800">주간보고서</h3>
        <div className="grid grid-cols-2 gap-3">
          {data.weekly.map((w, i) => (
            <div key={i} className={`${card} p-4`}>
              <div className="text-xs font-semibold text-slate-500">{w.label}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-[11px] text-slate-400">출석</span>
                <span className="text-2xl font-extrabold text-slate-800">{w.score}</span>
                <span className="text-xs text-slate-400">점</span>
              </div>
              <span className="mt-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                상위 {w.percentile}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 시험 결과 추이 */}
      <div className={`${card} p-5`}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">시험 결과</h3>
          <span className="text-[11px] text-slate-400">회차별 점수 추이</span>
        </div>
        <LineChart points={data.examTrend.points} labels={data.examTrend.labels} color={accent} />
      </div>

      {/* 진행 현황 (도넛) */}
      <div className={`${card} p-5`}>
        <h3 className="mb-3 text-sm font-bold text-slate-800">진행 현황</h3>
        <div className="flex items-center gap-5">
          <Donut value={data.progress.percent} color={accent} />
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-xs">📘</span>현재 {data.progress.current}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="inline-block size-2 rounded-full bg-rose-400" />
              미완성 {data.progress.incomplete}
            </div>
          </div>
        </div>
      </div>
    </StudentFrame>
  );
}
