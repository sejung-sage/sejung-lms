import Link from "next/link";

export type StudentTab = "home" | "learn" | "grade" | "my";

const TABS: { key: StudentTab; label: string; icon: string; path: string }[] = [
  { key: "home", label: "홈", icon: "home", path: "" },
  { key: "learn", label: "학습", icon: "book", path: "/learn" },
  { key: "grade", label: "성적", icon: "chart", path: "/grade" },
  { key: "my", label: "마이", icon: "user", path: "/my" },
];

function Icon({ name, color, active }: { name: string; color: string; active: boolean }) {
  const c = active ? color : "currentColor";
  const common = { width: 22, height: 22, fill: "none", stroke: c, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "home": return <svg {...common} viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>;
    case "book": return <svg {...common} viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 0 2 2h12" /></svg>;
    case "chart": return <svg {...common} viewBox="0 0 24 24"><path d="M5 21V10" /><path d="M12 21V4" /><path d="M19 21v-7" /></svg>;
    default: return <svg {...common} viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>;
  }
}

export function StudentTabBar({ slug, active, accent }: { slug: string; active: StudentTab; accent: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-black/5 bg-white/90 backdrop-blur">
      <ul className="flex items-stretch justify-around px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2">
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={`/s/${slug}/student${t.path}`}
                className={`flex w-16 flex-col items-center gap-1 py-1 ${on ? "" : "text-slate-400"}`}
                style={on ? { color: accent } : undefined}
                aria-current={on ? "page" : undefined}
              >
                <Icon name={t.icon} color={accent} active={on} />
                <span className="text-[11px] font-medium">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
