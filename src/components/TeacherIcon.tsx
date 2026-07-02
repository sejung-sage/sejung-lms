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
 * 커스텀 icon_url 이 있으면 이미지, 없으면 과목색 + 이니셜 템플릿.
 */
export function TeacherIcon({ space }: { space: TeacherSpace }) {
  const initial = space.name.replace(/쌤$/, "").charAt(0) || space.name.charAt(0);
  const href = space.slug ? `/s/${space.slug}` : "#";

  return (
    <Link href={href} className="group flex flex-col items-center gap-2">
      <div
        className="flex size-16 items-center justify-center overflow-hidden rounded-[22%] text-2xl font-bold text-white shadow-md ring-1 ring-black/5 transition-transform duration-150 group-hover:scale-105 group-active:scale-95 sm:size-20"
        style={{ backgroundColor: space.accent_color }}
      >
        {space.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={space.icon_url} alt={space.name} className="size-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {space.name}
        </span>
        {space.subject && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {space.subject}
          </span>
        )}
      </div>
    </Link>
  );
}
