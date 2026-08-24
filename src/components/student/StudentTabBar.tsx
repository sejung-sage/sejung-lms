import Link from "next/link";

export type StudentTab = "home" | "learn" | "grade" | "my";

const TABS: { key: StudentTab; label: string; path: string }[] = [
  { key: "home", label: "홈", path: "" },
  { key: "learn", label: "학습", path: "/learn" },
  { key: "grade", label: "성적", path: "/grade" },
  { key: "my", label: "마이", path: "/my" },
];

/**
 * 토스 앱 하단 탭: 활성 탭은 '색'이 아니라 '꽉 찬 아이콘 + 진한 회색'으로 표시한다.
 * (파랑은 화면 안의 주행동 버튼에만 남겨둔다)
 */
function TabIcon({ name, active }: { name: StudentTab; active: boolean }) {
  const size = 24;
  if (active) {
    const solid: Record<StudentTab, React.ReactNode> = {
      home: <path d="M11.3 2.9a1 1 0 0 1 1.4 0l8 7.4a1 1 0 0 1 .3.8V20a1 1 0 0 1-1 1h-4.6v-5.4a1 1 0 0 0-1-1h-2.8a1 1 0 0 0-1 1V21H6a1 1 0 0 1-1-1v-8.9a1 1 0 0 1 .3-.8z" />,
      learn: <path d="M6.5 2.5H19a1 1 0 0 1 1 1v13.2H6.5a1.9 1.9 0 0 0-1.9 1.9V4.4a1.9 1.9 0 0 1 1.9-1.9zM4.6 19.6a1.9 1.9 0 0 0 1.9 1.9H20v-3.3H6.5a1.9 1.9 0 0 0-1.9 1.4z" />,
      grade: (
        <>
          <rect x="3.6" y="12" width="3.6" height="9" rx="1.4" />
          <rect x="10.2" y="3" width="3.6" height="18" rx="1.4" />
          <rect x="16.8" y="8" width="3.6" height="13" rx="1.4" />
        </>
      ),
      my: (
        <>
          <circle cx="12" cy="8" r="4.2" />
          <path d="M12 14.2c-4.3 0-7.6 2.3-7.6 5.4 0 .8.6 1.4 1.4 1.4h12.4c.8 0 1.4-.6 1.4-1.4 0-3.1-3.3-5.4-7.6-5.4z" />
        </>
      ),
    };
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        {solid[name]}
      </svg>
    );
  }

  const line: Record<StudentTab, React.ReactNode> = {
    home: (
      <>
        <path d="M3.5 10.4 12 3l8.5 7.4" />
        <path d="M5.5 9.6V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.6" />
      </>
    ),
    learn: (
      <>
        <path d="M6.5 2.9H19a.6.6 0 0 1 .6.6v13.2H6.5a1.9 1.9 0 0 0-1.9 1.9V4.8a1.9 1.9 0 0 1 1.9-1.9z" />
        <path d="M4.6 19.6a1.9 1.9 0 0 0 1.9 1.9h13.1" />
      </>
    ),
    grade: (
      <>
        <path d="M5.4 21v-8" />
        <path d="M12 21V4" />
        <path d="M18.6 21v-6" />
      </>
    ),
    my: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.6 20.6c0-3.6 3.3-6 7.4-6s7.4 2.4 7.4 6" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {line[name]}
    </svg>
  );
}

export function StudentTabBar({ slug, active }: { slug: string; active: StudentTab }) {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-grey-200 bg-white">
      <ul className="flex items-stretch justify-around px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2">
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <li key={t.key} className="flex-1">
              <Link
                href={`/s/${slug}/student${t.path}`}
                className={`flex flex-col items-center gap-1 py-1 transition-colors duration-100 ${
                  on ? "text-grey-900" : "text-grey-400"
                }`}
                aria-current={on ? "page" : undefined}
              >
                <TabIcon name={t.key} active={on} />
                <span
                  className={`text-[11px] tracking-[-0.02em] ${
                    on ? "font-bold" : "font-medium"
                  }`}
                >
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
