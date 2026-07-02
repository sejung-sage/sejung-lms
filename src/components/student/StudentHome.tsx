import type { StudentHome as StudentHomeData } from "@/lib/student";
import type { SpaceDetail } from "@/lib/spaces";
import { QrGlyph } from "./QrGlyph";
import { StudentFrame } from "./StudentFrame";

const card =
  "rounded-3xl bg-white/90 shadow-[0_8px_30px_-14px_rgba(60,50,120,0.18)] ring-1 ring-black/[0.04]";

function CheckBox({ done, accent }: { done: boolean; accent: string }) {
  return (
    <span className="flex size-5 items-center justify-center rounded-md border-2 text-white transition"
      style={done ? { backgroundColor: accent, borderColor: accent } : { borderColor: "#d4d4d8" }}>
      {done && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

export function StudentHome({ space, slug, data }: { space: SpaceDetail; slug: string; data: StudentHomeData }) {
  const accent = space.accent_color;
  const w = data.thisWeek;

  return (
    <StudentFrame space={space} slug={slug} active="home">
      {/* 수업 카드 */}
      <section className="relative overflow-hidden rounded-3xl px-5 py-5 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 60%, ${accent}aa 100%)` }}>
        <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur">{w.tag}</span>
            <h2 className="mt-2.5 text-lg font-bold leading-snug">{w.title}</h2>
          </div>
          <button className="flex flex-col items-center gap-1 rounded-2xl bg-white p-2.5 shadow-md">
            <QrGlyph />
            <span className="text-[10px] font-bold text-slate-500">등원 QR</span>
          </button>
        </div>
        <dl className="relative mt-4 space-y-1.5 text-sm text-white/90">
          <div className="flex items-center gap-2"><span>📚</span><span>{w.className}</span></div>
          <div className="flex items-center gap-2"><span>📍</span><span>{w.location}</span></div>
          <div className="flex items-center gap-2"><span>🗓️</span><span>{w.week} · {w.time}</span></div>
        </dl>
      </section>

      {/* 이번 주 현황 */}
      <h3 className="px-1 pt-1 text-sm font-bold text-slate-800">이번 주 현황</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className={`${card} p-4`}>
          <div className="text-xs font-medium text-slate-400">과제 수행</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold" style={{ color: accent }}>{data.assignmentGrade.grade}</span>
            <span className="text-[11px] text-slate-400">등급</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">{data.assignmentGrade.desc}</div>
        </div>
        <div className={`${card} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{data.test.round}</span>
            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">상위 {data.test.percentile}%</span>
          </div>
          <div className="mt-1 flex items-baseline gap-0.5">
            <span className="text-3xl font-extrabold text-slate-800">{data.test.score}</span>
            <span className="text-sm text-slate-400">/ {data.test.max}점</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">반평균 {data.test.classAvg}점</div>
        </div>
      </div>

      {/* 이번 주 숙제 */}
      <div className={`${card} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">이번 주 숙제</h3>
          <span className="text-[11px] text-slate-400">{data.homework.filter((h) => h.done).length}/{data.homework.length} 완료</span>
        </div>
        <ul className="space-y-1">
          {data.homework.map((h, i) => (
            <li key={i} className="flex items-center justify-between rounded-2xl px-1 py-2">
              <div className="flex items-center gap-3">
                <CheckBox done={h.done} accent={accent} />
                <div>
                  <div className={`text-sm font-semibold ${h.done ? "text-slate-400 line-through" : "text-slate-800"}`}>{h.title}</div>
                  <div className="text-[11px] text-slate-400">{h.sub}</div>
                </div>
              </div>
              {!h.done && (
                <button className="rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-sm" style={{ backgroundColor: accent }}>제출하기</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* 공지 */}
      <div className={`${card} p-5`}>
        <div className="flex items-start gap-2">
          <span className="text-sm">📌</span>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-800">{data.notice.title}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{data.notice.body}</p>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <span>{data.notice.teacher}</span><span>·</span><span>{data.notice.date}</span>
            </div>
          </div>
        </div>
      </div>
    </StudentFrame>
  );
}
