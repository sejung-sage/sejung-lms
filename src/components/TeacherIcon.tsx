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
 * 런처의 "쌤 공간" 하나. 화면 폭에 따라 두 모습을 가진다.
 *
 *   모바일  — 폰 홈 화면처럼 납작한 스퀘어클 아이콘 + 아래 이름.
 *             학생이 매일 쓰는 진입점이라 이 형태가 맞다.
 *   데스크톱 — 카드. 아이콘만 늘어놓으면 넓은 화면에서 조각처럼 떠 버린다.
 *             (레퍼런스 .card 규칙대로 hover 시 blue-soft 로 통째로 물든다)
 *
 * 마크업은 하나다. 반응형 클래스로만 갈라진다 — 같은 걸 두 번 렌더하지 않으려고.
 */
export function TeacherIcon({ space, href: to }: { space: TeacherSpace; href?: string }) {
  const initial = space.name.replace(/쌤$/, "").charAt(0) || space.name.charAt(0);
  const href = to ?? (space.slug ? `/s/${space.slug}` : "#");

  return (
    <Link
      href={href}
      className={[
        "group pressable flex flex-col items-center gap-2",
        "sm:flex-row sm:items-center sm:gap-3.5 sm:rounded-card sm:border sm:border-grey-200",
        "sm:bg-white sm:p-4 sm:transition-colors sm:duration-100",
        "sm:hover:border-blue-200 sm:hover:bg-blue-100",
      ].join(" ")}
    >
      <div
        className={[
          "flex size-[60px] shrink-0 items-center justify-center overflow-hidden",
          "rounded-[22px] text-[24px] font-bold text-white",
          "transition-transform duration-100 group-active:scale-[0.94]",
          "sm:size-12 sm:rounded-md sm:text-[19px]",
        ].join(" ")}
        style={{ backgroundColor: space.accent_color }}
      >
        {space.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={space.icon_url} alt={space.name} className="size-full object-cover" />
        ) : (
          initial
        )}
      </div>

      <div className="flex min-w-0 flex-col items-center sm:items-start">
        <span className="truncate text-[14px] font-semibold text-grey-900 sm:text-[16px] sm:font-bold sm:group-hover:text-blue-600">
          {space.name}
        </span>
        {space.subject && (
          <span className="text-[12px] font-medium text-grey-500 sm:text-[13px] sm:group-hover:text-blue-500">
            {space.subject}
          </span>
        )}
      </div>

      {/* 데스크톱 카드에서만 — 누를 수 있다는 신호 */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="ml-auto hidden size-[18px] shrink-0 text-grey-300 group-hover:text-blue-500 sm:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
