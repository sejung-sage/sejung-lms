import type { SpaceDetail } from "@/lib/spaces";
import { AdminSidebar, type NavKey } from "./AdminSidebar";
import { ButtonLink } from "@/components/ui/Button";

/**
 * 관리자 웹 공용 레이아웃: 좌측 사이드바 + 상단바 + 콘텐츠.
 * 토스식: 흰 크롬 / grey-50 본문 / 경계는 1px 선으로만.
 */
export function AdminShell({
  space,
  slug,
  active,
  title,
  subtitle,
  children,
}: {
  space: SpaceDetail;
  slug: string;
  active: NavKey;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const accent = space.accent_color;
  const initial = space.name.replace(/쌤$/, "").charAt(0) || space.name.charAt(0);

  return (
    <div className="flex min-h-dvh bg-grey-50 text-grey-900">
      <AdminSidebar
        slug={slug}
        spaceName={space.name}
        subject={space.subject}
        accent={accent}
        initial={initial}
        active={active}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-grey-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-8 items-center justify-center rounded-[10px] text-[13px] font-bold text-white md:hidden"
              style={{ backgroundColor: accent }}
            >
              {initial}
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-grey-900">{title}</h1>
              {subtitle && <p className="text-[13px] text-grey-500">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="num hidden h-9 items-center rounded-[10px] bg-grey-100 px-3 text-[14px] font-medium text-grey-600 sm:inline-flex">
              2026년 7월
            </span>
            <span className="inline-flex h-9 items-center rounded-[10px] bg-grey-100 px-3 text-[14px] font-semibold text-grey-700">
              실장
            </span>
            <ButtonLink href={`/s/${slug}/parent`} variant="secondary" size="sm" className="hidden sm:inline-flex">
              학부모 앱
            </ButtonLink>
            <ButtonLink href={`/s/${slug}/student`} variant="primary" size="sm">
              학생 앱
            </ButtonLink>
          </div>
        </header>

        <main className="flex-1 space-y-4 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
