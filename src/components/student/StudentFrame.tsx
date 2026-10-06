import type { SpaceDetail } from "@/lib/spaces";
import { StudentTabBar, type StudentTab } from "./StudentTabBar";
import { ButtonLink } from "@/components/ui/Button";

/** 학생 앱 공용 프레임: 상단바 + 콘텐츠 + 하단 탭. */
export function StudentFrame({
  space, slug, active, pageLabel, preview = false, children,
}: {
  space: SpaceDetail;
  slug: string;
  active: StudentTab;
  pageLabel?: string;
  /** 운영진이 학생 화면을 들여다보는 중 — 관리자 뷰 버튼과 안내 띠를 보여준다 */
  preview?: boolean;
  children: React.ReactNode;
}) {
  const accent = space.accent_color;
  const initial = space.name.replace(/쌤$/, "").charAt(0) || space.name.charAt(0);

  return (
    <div className="flex min-h-dvh w-full min-w-0 justify-center bg-white sm:bg-grey-100">
      <div className="flex min-h-dvh w-full min-w-0 max-w-md flex-col border-grey-200 bg-white sm:border-x">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-grey-100 bg-white/95 px-5 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-9 items-center justify-center rounded-md text-[14px] font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            {initial}
          </div>
          <div className="leading-tight">
            <div className="text-[17px] font-bold text-grey-900">
              {pageLabel ?? space.name}
            </div>
            <div className="text-[12px] text-grey-500">{space.subject} · 학생</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {preview ? (
            <ButtonLink href={`/s/${slug}`} variant="secondary" size="xs">
              관리자 뷰
            </ButtonLink>
          ) : (
            <ButtonLink href="/" variant="secondary" size="xs">
              선생님 목록
            </ButtonLink>
          )}
          <button
            type="button"
            aria-label="알림"
            className="flex size-9 items-center justify-center rounded-full bg-grey-100 text-grey-600 transition-colors hover:bg-grey-200 active:scale-[0.96]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
              <path d="M10.3 20a2 2 0 0 0 3.4 0" />
            </svg>
          </button>
        </div>
      </header>

      {preview && (
        <div className="bg-amber-50 px-5 py-2 text-[12.5px] font-medium text-amber-500">
          운영진 미리보기 · 이 공간 첫 학생의 화면이에요. 제출 같은 동작은 막혀 있어요.
        </div>
      )}
      <main className="min-w-0 flex-1 space-y-3 px-5 pb-4 pt-1">{children}</main>

        <StudentTabBar slug={slug} active={active} />
      </div>
    </div>
  );
}
