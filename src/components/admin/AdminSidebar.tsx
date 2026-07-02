import Link from "next/link";

/* 간단한 라인 아이콘 세트 */
function Ic({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}
const ICON = {
  dash: "M3 10.5 12 3l9 7.5|M5 9.5V21h14V9.5",
  check: "M9 11l3 3L22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  book: "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z|M4 19a2 2 0 0 0 2 2h12",
  refresh: "M21 12a9 9 0 1 1-3-6.7|M21 4v4h-4",
  users: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  badge: "M9 12l2 2 4-4|M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7z",
  chart: "M5 21V10|M12 21V4|M19 21v-7",
  video: "M15 10l5-3v10l-5-3z|M3 6h12v12H3z",
};

type Item = { label: string; icon: keyof typeof ICON; active?: boolean };
type Group = { title?: string; items: Item[] };

const NAV: Group[] = [
  { items: [{ label: "대시보드", icon: "dash", active: true }] },
  { title: "수업 현장", items: [
    { label: "출석 관리", icon: "check" },
    { label: "숙제 관리", icon: "book" },
    { label: "보강 관리", icon: "refresh" },
  ] },
  { title: "학생", items: [
    { label: "학생 목록", icon: "users" },
    { label: "계정 승인", icon: "badge" },
  ] },
  { title: "학습 관리", items: [
    { label: "성적", icon: "chart" },
    { label: "영상 관리", icon: "video" },
  ] },
];

export function AdminSidebar({
  spaceName,
  subject,
  accent,
  initial,
}: {
  spaceName: string;
  subject: string | null;
  accent: string;
  initial: string;
}) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 text-slate-300 md:flex">
      {/* 로고 */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div
          className="flex size-9 items-center justify-center rounded-xl text-sm font-bold text-white shadow"
          style={{ background: `linear-gradient(145deg, ${accent}, ${accent}bb)` }}
        >
          {initial}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-bold text-white">{spaceName}</div>
          <div className="truncate text-[11px] text-slate-400">{subject} · 관리자</div>
        </div>
      </div>

      {/* 네비 */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV.map((g, gi) => (
          <div key={gi}>
            {g.title && (
              <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {g.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={it.label}>
                  <button
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      it.active
                        ? "font-semibold text-white"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                    style={it.active ? { backgroundColor: `${accent}33` } : undefined}
                  >
                    <span style={it.active ? { color: accent } : undefined}>
                      <Ic d={ICON[it.icon]} />
                    </span>
                    {it.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* 하단 사용자 */}
      <div className="border-t border-white/5 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
              원
            </div>
            <div className="text-xs">
              <div className="font-semibold text-white">목데이터 원장</div>
              <div className="text-slate-500">실장</div>
            </div>
          </div>
          <Link href="/" className="text-slate-500 transition hover:text-white" title="로그아웃/홈">
            <Ic d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5|M21 12H9" size={17} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
