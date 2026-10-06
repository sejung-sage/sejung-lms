import Link from "next/link";
import type { SpaceDetail } from "@/lib/spaces";
import { AdminSidebar, type NavKey } from "./AdminSidebar";
import { ButtonLink } from "@/components/ui/Button";

/**
 * 관리자 웹 레이아웃: 아이콘 레일 + 흰 헤더 + 회색 본문.
 *
 * 표면 규칙 — 크롬(레일/헤더)은 흰색, 본문은 --panel(grey-50), 그 위에 흰 카드.
 * 흰 위에 흰을 얹으면 카드 경계가 사라지므로 본문만 회색으로 내린다.
 */

const MOBILE_NAV: { key: NavKey; label: string; path: string }[] = [
  { key: "dash", label: "대시보드", path: "" },
  { key: "attendance", label: "출석", path: "/admin/attendance" },
  { key: "homework", label: "숙제", path: "/admin/homework" },
  { key: "makeup", label: "보강", path: "/admin/makeup" },
  { key: "students", label: "학생", path: "/admin/students" },
  { key: "approvals", label: "승인", path: "/admin/approvals" },
  { key: "grades", label: "성적", path: "/admin/grades" },
  { key: "omr", label: "OMR", path: "/admin/omr" },
  { key: "videos", label: "영상", path: "/admin/videos" },
];

/** 헤더와 본문이 같은 폭·같은 좌우 여백을 쓴다.
    상한을 두는 이유: 1920px 에서 표 한 줄이 1800px 까지 늘어나면
    이름은 맨 왼쪽, 상태 배지는 맨 오른쪽이라 눈이 너무 멀리 간다. */
const INNER = "mx-auto w-full max-w-[1600px] px-5";

export function AdminShell({
  space,
  slug,
  active,
  title,
  subtitle,
  actions,
  children,
}: {
  space: SpaceDetail;
  slug: string;
  active: NavKey;
  title: string;
  subtitle?: string;
  /** 화면별 주행동 버튼 — 없으면 헤더 우측은 앱 전환 버튼만 남는다 */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const accent = space.accent_color;
  const initial = space.name.replace(/쌤$/, "").charAt(0) || space.name.charAt(0);

  return (
    <div className="flex min-h-dvh w-full min-w-0 bg-panel text-grey-900">
      <AdminSidebar
        slug={slug}
        spaceName={space.name}
        accent={accent}
        initial={initial}
        active={active}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-grey-200 bg-white">
          <div className={`${INNER} flex flex-wrap items-center justify-between gap-3 py-3.5`}>
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-sm text-[13px] font-bold text-white md:hidden"
                style={{ backgroundColor: accent }}
              >
                {initial}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <h1 className="truncate text-[19px] font-bold text-grey-900">{title}</h1>
                  <span className="hidden truncate text-[13px] text-grey-500 sm:inline">
                    {space.name}
                    {space.subject ? ` · ${space.subject}` : ""}
                  </span>
                </div>
                {subtitle && <p className="truncate text-[12.5px] text-grey-500">{subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {actions}
              <ButtonLink href={`/s/${slug}/parent`} variant="secondary" size="sm" className="hidden sm:inline-flex">
                학부모 앱
              </ButtonLink>
              <ButtonLink href={`/s/${slug}/student`} variant="secondary" size="sm">
                학생 앱
              </ButtonLink>
            </div>
          </div>

          {/* 레일이 사라지는 좁은 화면에서의 대체 내비 */}
          <nav className={`${INNER} flex gap-1.5 overflow-x-auto pb-2.5 md:hidden`}>
            {MOBILE_NAV.map((n) => {
              const on = n.key === active;
              return (
                <Link
                  key={n.key}
                  href={`/s/${slug}${n.path}`}
                  aria-current={on ? "page" : undefined}
                  className={`pressable shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    on ? "bg-blue-500 text-white" : "bg-grey-100 text-grey-700"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 overflow-y-auto py-5">
          <div className={`${INNER} space-y-4`}>{children}</div>
        </main>
      </div>
    </div>
  );
}
