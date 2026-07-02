import Link from "next/link";
import type { StudentHome as StudentHomeData } from "@/lib/student";
import type { SpaceDetail } from "@/lib/spaces";
import { QrGlyph } from "./QrGlyph";
import { StudentTabBar } from "./StudentTabBar";

const card =
  "rounded-3xl bg-white/90 shadow-[0_8px_30px_-14px_rgba(60,50,120,0.18)] ring-1 ring-black/[0.04] dark:bg-zinc-900/70 dark:ring-white/[0.06]";

function CheckBox({ done, accent }: { done: boolean; accent: string }) {
  return (
    <span
      className="flex size-5 items-center justify-center rounded-md border-2 text-white transition"
      style={done ? { backgroundColor: accent, borderColor: accent } : { borderColor: "#d4d4d8" }}
    >
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
  const initial = space.name.replace(/쌤$/, "").charAt(0) || space.name.charAt(0);
  const w = data.thisWeek;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[#F6F5FB] pb-24 dark:bg-black">
      {/* 상단바 */}
      <header className="flex items-center justify-between px-4 pb-2 pt-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-9 items-center justify-center rounded-[26%] text-sm font-bold text-white shadow-sm"
            style={{ background: `linear-gradient(145deg, ${accent}, ${accent}c0)` }}
          >
            {initial}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{space.name}</div>
            <div className="text-[11px] text-zinc-400">{space.subject} · 학생</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/s/${slug}`} className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-zinc-500 shadow-sm ring-1 ring-black/5 dark:bg-zinc-800/70 dark:text-zinc-300 dark:ring-white/5">
            관리자 뷰
          </Link>
          <button className="flex size-9 items-center justify-center rounded-full bg-white/70 text-zinc-400 shadow-sm ring-1 ring-black/5 dark:bg-zinc-800/70 dark:ring-white/5">
            🔔
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 pt-2">
        {/* ── 수업 카드 (테마 그라데이션 + 등원 QR) ── */}
        <section
          className="relative overflow-hidden rounded-3xl px-5 py-5 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 60%, ${accent}aa 100%)` }}
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur">
                {w.tag}
              </span>
              <h2 className="mt-2.5 text-lg font-bold leading-snug">{w.title}</h2>
            </div>
            {/* 등원 QR */}
            <button className="flex flex-col items-center gap-1 rounded-2xl bg-white p-2.5 shadow-md">
              <QrGlyph />
              <span className="text-[10px] font-bold text-zinc-500">등원 QR</span>
            </button>
          </div>
          <dl className="relative mt-4 space-y-1.5 text-sm text-white/90">
            <div className="flex items-center gap-2"><span>📚</span><span>{w.className}</span></div>
            <div className="flex items-center gap-2"><span>📍</span><span>{w.location}</span></div>
            <div className="flex items-center gap-2"><span>🗓️</span><span>{w.week} · {w.time}</span></div>
          </dl>
        </section>

        {/* ── 이번 주 현황 ── */}
        <h3 className="px-1 pt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">이번 주 현황</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className={`${card} p-4`}>
            <div className="text-xs font-medium text-zinc-400">과제 수행</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold" style={{ color: accent }}>{data.assignmentGrade.grade}</span>
              <span className="text-[11px] text-zinc-400">등급</span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">{data.assignmentGrade.desc}</div>
          </div>
          <div className={`${card} p-4`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">{data.test.round}</span>
              <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-500 dark:bg-rose-500/15 dark:text-rose-300">
                상위 {data.test.percentile}%
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-0.5">
              <span className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-50">{data.test.score}</span>
              <span className="text-sm text-zinc-400">/ {data.test.max}점</span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">반평균 {data.test.classAvg}점</div>
          </div>
        </div>

        {/* ── 이번 주 숙제 ── */}
        <div className={`${card} p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">이번 주 숙제</h3>
            <span className="text-[11px] text-zinc-400">
              {data.homework.filter((h) => h.done).length}/{data.homework.length} 완료
            </span>
          </div>
          <ul className="space-y-1">
            {data.homework.map((h, i) => (
              <li key={i} className="flex items-center justify-between rounded-2xl px-1 py-2">
                <div className="flex items-center gap-3">
                  <CheckBox done={h.done} accent={accent} />
                  <div>
                    <div className={`text-sm font-semibold ${h.done ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-100"}`}>
                      {h.title}
                    </div>
                    <div className="text-[11px] text-zinc-400">{h.sub}</div>
                  </div>
                </div>
                {!h.done && (
                  <button
                    className="rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: accent }}
                  >
                    제출하기
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* ── 공지 ── */}
        <div className={`${card} p-5`}>
          <div className="flex items-start gap-2">
            <span className="text-sm">📌</span>
            <div className="flex-1">
              <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{data.notice.title}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{data.notice.body}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-400">
                <span>{data.notice.teacher}</span>
                <span>·</span>
                <span>{data.notice.date}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <StudentTabBar active="home" accent={accent} />
    </div>
  );
}
