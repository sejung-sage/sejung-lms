import Link from "next/link";

export type TeacherSpace = {
  id: string;
  name: string;
  subject: string | null;
  slug: string | null;
  accent_color: string;
  icon_url: string | null;
};

/**
 * HM 런처의 정사각형 "쌤 아이콘" 하나.
 * 커스텀 icon_url 이 있으면 이미지, 없으면 과목색 그라데이션 + 이니셜.
 */
export function TeacherIcon({ space }: { space: TeacherSpace }) {
  const initial = space.name.replace(/쌤$/, "").charAt(0) || space.name.charAt(0);
  const href = space.slug ? `/s/${space.slug}` : "#";
  const accent = space.accent_color;

  return (
    <Link href={href} className="group flex flex-col items-center gap-2.5">
      <div
        className="relative flex size-16 items-center justify-center overflow-hidden rounded-[28%] text-2xl font-bold text-white ring-1 ring-black/5 transition-all duration-200 group-hover:-translate-y-1 group-active:scale-95 sm:size-[4.5rem]"
        style={{
          background: `linear-gradient(145deg, ${accent} 0%, ${accent}c0 100%)`,
          boxShadow: `0 10px 22px -8px ${accent}90`,
        }}
      >
        {/* 상단 하이라이트 광택 */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
        {space.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={space.icon_url} alt={space.name} className="size-full object-cover" />
        ) : (
          <span className="relative drop-shadow-sm">{initial}</span>
        )}
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {space.name}
        </span>
        {space.subject && (
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-zinc-500 shadow-sm ring-1 ring-black/[0.03] dark:bg-zinc-800 dark:text-zinc-400 dark:ring-white/5">
            {space.subject}
          </span>
        )}
      </div>
    </Link>
  );
}
