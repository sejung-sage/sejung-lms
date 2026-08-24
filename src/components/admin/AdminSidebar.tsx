import Link from "next/link";

/**
 * 아이콘 레일 사이드바 — 대치온 CRM 구조.
 *
 * 넓은 사이드바(248px) 대신 76px 레일을 쓰는 이유는 취향이 아니라 계산이다.
 * 이 화면의 주인공은 40행짜리 표이고, 표에는 이름·전화번호·출결이력·성적추이가
 * 동시에 들어간다. 사이드바에서 되찾은 172px 이 그대로 표의 열 하나가 된다.
 *
 * 색·글자는 레퍼런스 규칙: 활성 항목은 blue-soft 바탕 + blue 글자 700.
 */

function Ic({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
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
  home: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5|M21 12H9",
  list: "M8 6h13|M8 12h13|M8 18h13|M3 6h.01|M3 12h.01|M3 18h.01",
  calendar: "M8 2v4|M16 2v4|M3 10h18|M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2",
};

export type NavKey =
  | "dash" | "attendance" | "homework" | "makeup"
  | "students" | "approvals" | "grades" | "videos"
  | "todos" | "clinic";

type Item = {
  key: NavKey;
  label: string;
  icon: keyof typeof ICON;
  href: string;
  /** 처리해야 할 건수. 값이 있을 때만 빨간 점이 붙는다. */
  badge?: number;
};

function nav(slug: string): Item[][] {
  const a = `/s/${slug}/admin`;
  // 배열 하나 = 레일 위 한 덩어리. 덩어리 사이에만 얇은 구분선이 들어간다.
  return [
    [{ key: "dash", label: "대시보드", icon: "dash", href: `/s/${slug}` }],
    [
      { key: "attendance", label: "출석", icon: "check", href: `${a}/attendance` },
      { key: "homework", label: "숙제", icon: "book", href: `${a}/homework` },
      { key: "todos", label: "할 일", icon: "list", href: `${a}/todos` },
      { key: "clinic", label: "클리닉", icon: "calendar", href: `${a}/clinic` },
      { key: "makeup", label: "보강", icon: "refresh", href: `${a}/makeup` },
    ],
    [
      { key: "students", label: "학생", icon: "users", href: `${a}/students` },
      { key: "approvals", label: "승인", icon: "badge", href: `${a}/approvals` },
    ],
    [
      { key: "grades", label: "성적", icon: "chart", href: `${a}/grades` },
      { key: "videos", label: "영상", icon: "video", href: `${a}/videos` },
    ],
  ];
}

function RailItem({ item, on }: { item: Item; on: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={on ? "page" : undefined}
      className={`pressable relative flex flex-col items-center gap-1 rounded-md py-2.5 transition-colors duration-100 ${
        on
          ? "bg-blue-100 text-blue-600"
          : "text-grey-600 hover:bg-grey-100 hover:text-grey-900"
      }`}
    >
      <Ic d={ICON[item.icon]} />
      <span className={`text-[11px] tracking-[-0.02em] ${on ? "font-bold" : "font-semibold"}`}>
        {item.label}
      </span>
      {item.badge ? (
        <span className="absolute right-2 top-1.5 inline-flex min-w-[17px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-[17px] text-white">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export function AdminSidebar({
  slug, spaceName, accent, initial, active, version = "v0.1",
}: {
  slug: string;
  spaceName: string;
  accent: string;
  initial: string;
  active: NavKey;
  version?: string;
}) {
  return (
    <aside className="hidden w-[76px] shrink-0 flex-col border-r border-grey-200 bg-white md:flex">
      <Link
        href="/"
        title={`${spaceName} · 런처로`}
        className="pressable mx-auto mb-1 mt-4 flex size-10 items-center justify-center rounded-md text-[15px] font-bold text-white"
        style={{ backgroundColor: accent }}
      >
        {initial}
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 pb-3 pt-2">
        {nav(slug).map((group, gi) => (
          <div
            key={gi}
            className={gi > 0 ? "mt-1.5 border-t border-grey-100 pt-1.5" : ""}
          >
            <ul className="space-y-0.5">
              {group.map((it) => (
                <li key={it.key}>
                  <RailItem item={it} on={it.key === active} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-grey-100 px-2 py-3">
        <Link
          href="/"
          title="런처로 나가기"
          className="pressable flex flex-col items-center gap-1 rounded-md py-2 text-grey-500 transition-colors hover:bg-grey-100 hover:text-grey-900"
        >
          <Ic d={ICON.home} size={18} />
          <span className="text-[11px] font-semibold tracking-[-0.02em]">나가기</span>
        </Link>
        <div className="pt-2 text-center text-[10px] text-grey-400">{version}</div>
      </div>
    </aside>
  );
}
