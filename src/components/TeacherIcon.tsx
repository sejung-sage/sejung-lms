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
 * 런처의 "쌤 아이콘" 하나.
 * 토스 홈의 서비스 아이콘처럼 — 그라데이션/광택 없이 납작한 단색 스퀘어클,
 * 누르면 살짝 눌리는 피드백만.
 */
export function TeacherIcon({ space }: { space: TeacherSpace }) {
  const initial = space.name.replace(/쌤$/, "").charAt(0) || space.name.charAt(0);
  const href = space.slug ? `/s/${space.slug}` : "#";

  return (
    <Link href={href} className="group flex flex-col items-center gap-2">
      <div
        className="flex size-[60px] items-center justify-center overflow-hidden rounded-[22px] text-[24px] font-bold text-white transition-transform duration-100 group-active:scale-[0.94] sm:size-16 sm:rounded-[24px]"
        style={{ backgroundColor: space.accent_color }}
      >
        {space.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={space.icon_url} alt={space.name} className="size-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[14px] font-semibold text-grey-900">{space.name}</span>
        {space.subject && (
          <span className="text-[12px] font-medium text-grey-500">{space.subject}</span>
        )}
      </div>
    </Link>
  );
}
