import Link from "next/link";
import type { SpaceDetail } from "@/lib/spaces";
import type { ParentHome as ParentHomeData } from "@/lib/parent";
import { LineChart } from "@/components/student/charts";

const card = "rounded-3xl bg-white/90 shadow-[0_8px_30px_-14px_rgba(60,50,120,0.18)] ring-1 ring-black/[0.04]";

export function ParentHome({ space, slug, data }: { space: SpaceDetail; slug: string; data: ParentHomeData }) {
  const accent = space.accent_color;
  const initial = space.name.replace(/쌤$/, "").charAt(0) || space.name.charAt(0);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[#F6F5FB] pb-10">
      {/* 상단바 */}
      <header className="flex items-center justify-between px-4 pb-2 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-[26%] text-sm font-bold text-white shadow-sm"
            style={{ background: `linear-gradient(145deg, ${accent}, ${accent}c0)` }}>{initial}</div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-900">{space.name}</div>
            <div className="text-[11px] text-slate-400">{space.subject} · 학부모</div>
          </div>
        </div>
        <Link href="/" className="flex size-9 items-center justify-center rounded-full bg-white/70 text-slate-400 shadow-sm ring-1 ring-black/5">🔔</Link>
      </header>

      <main className="flex-1 space-y-4 px-4 pt-2">
        {/* 자녀 스위처 */}
        <div className="flex items-center gap-2">
          {data.children.map((c) => {
            const on = c === data.child;
            return (
              <span key={c}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${on ? "text-white shadow-sm" : "bg-white text-slate-500 ring-1 ring-black/5"}`}
                style={on ? { backgroundColor: accent } : undefined}>
                {c}{on ? "" : " ▾"}
              </span>
            );
          })}
        </div>

        {/* 이번 주 요약 */}
        <div>
          <h3 className="mb-2 px-1 text-sm font-bold text-slate-800">{data.child} · 이번 주 요약</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { l: "출결", v: data.weekSummary.attendance, i: "✅" },
              { l: "숙제", v: data.weekSummary.homework, i: "📝" },
              { l: "테스트", v: data.weekSummary.test, i: "🎯" },
            ].map((s) => (
              <div key={s.l} className={`${card} p-3 text-center`}>
                <div className="text-lg">{s.i}</div>
                <div className="mt-1 text-[13px] font-bold text-slate-800">{s.v}</div>
                <div className="text-[11px] text-slate-400">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 성적 추이 */}
        <div className={`${card} p-5`}>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">성적 추이</h3>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-500">
              {data.recentScore.label} {data.recentScore.score}점 · 상위 {data.recentScore.percentile}%
            </span>
          </div>
          <LineChart points={data.examTrend.points} labels={data.examTrend.labels} color={accent} />
        </div>

        {/* 성장 기록 */}
        <div className={`${card} p-5`}>
          <h3 className="mb-3 text-sm font-bold text-slate-800">성장 기록</h3>
          <ul className="relative space-y-4 before:absolute before:left-[5px] before:top-1 before:h-[calc(100%-1rem)] before:w-px before:bg-slate-100">
            {data.growth.map((g, i) => (
              <li key={i} className="relative pl-6">
                <span className="absolute left-0 top-1 size-2.5 rounded-full ring-4 ring-white"
                  style={{ backgroundColor: g.kind === "good" ? accent : "#fb7185" }} />
                <div className="text-[13px] text-slate-700">{g.text}</div>
                <div className="text-[11px] text-slate-400">{g.date}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* 알림 */}
        <div className={`${card} p-5`}>
          <h3 className="mb-3 text-sm font-bold text-slate-800">알림</h3>
          <ul className="space-y-1">
            {data.alerts.map((a, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl px-1 py-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-slate-50 text-sm">{a.icon}</span>
                <span className="flex-1 text-[13px] text-slate-600">{a.text}</span>
                <span className="shrink-0 text-[11px] text-slate-400">{a.at}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
