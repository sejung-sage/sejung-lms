import Link from "next/link";
import type { SpaceDetail } from "@/lib/spaces";
import { AdminSidebar, type NavKey } from "./AdminSidebar";

/**
 * 관리자 웹 공용 레이아웃: 좌측 사이드바 + 상단바 + 콘텐츠.
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
    <div className="flex min-h-dvh bg-slate-50 text-slate-800">
      <AdminSidebar
        slug={slug}
        spaceName={space.name}
        subject={space.subject}
        accent={accent}
        initial={initial}
        active={active}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/[0.06] bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <div
              className="flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white md:hidden"
              style={{ background: `linear-gradient(145deg, ${accent}, ${accent}bb)` }}
            >
              {initial}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{title}</h1>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline-flex">
              📅 2026년 7월
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">실장</span>
            <Link
              href={`/s/${slug}/parent`}
              className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 sm:inline-block"
            >
              학부모 앱
            </Link>
            <Link
              href={`/s/${slug}/student`}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              학생 앱 →
            </Link>
          </div>
        </header>

        <main className="flex-1 space-y-4 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
