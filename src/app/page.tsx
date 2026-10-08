import Link from "next/link";
import { getSpaces } from "@/lib/spaces";
import { requireLogin, launcherSpaceIds } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { TeacherIcon } from "@/components/TeacherIcon";
import { CountPill } from "@/components/ui/Chip";

// 런처는 실시간 공간 목록 → 요청 시마다 렌더 (빌드 프리렌더 X)
export const dynamic = "force-dynamic";

/** 헤더와 본문이 같은 폭·같은 좌우 여백을 쓴다.
    (예전엔 헤더만 화면 전체 폭이라 제목과 그리드가 서로 어긋나 있었다) */
const CONTAINER = "mx-auto w-full max-w-5xl px-5 sm:px-6";

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="pressable flex size-9 items-center justify-center rounded-full bg-grey-100 text-grey-600 transition-colors hover:bg-grey-250 hover:text-grey-900"
    >
      {children}
    </button>
  );
}

/** 아이콘을 누르면 역할에 맞는 앱으로 — 운영진은 대시보드, 학생은 학생 앱, 학부모는 학부모 앱 */
const APP_PATH = { admin: "", student: "/student", parent: "/parent" } as const;

export default async function Home() {
  const viewer = await requireLogin();
  const [all, access] = await Promise.all([getSpaces(), launcherSpaceIds(viewer)]);
  const spaces = access.ids === "all" ? all : all.filter((s) => (access.ids as Set<string>).has(s.id));
  const hrefOf = (s: (typeof all)[number]) =>
    s.slug ? `/s/${s.slug}${APP_PATH[access.target.get(s.id) ?? "admin"]}` : "#";

  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="sticky top-0 z-10 border-b border-grey-200 bg-white/95 backdrop-blur-sm">
        <div className={`${CONTAINER} flex items-center justify-between py-3.5`}>
          <h1 className="text-[20px] font-bold tracking-[-0.03em] text-grey-900 sm:text-[22px]">
            세정학원
          </h1>
          <div className="flex items-center gap-1.5">
            {viewer.isAdmin && (
              <Link
                href="/hq"
                className="pressable mr-1 inline-flex h-9 items-center rounded-full bg-grey-900 px-3.5 text-[13px] font-semibold text-white hover:bg-grey-800"
              >
                학원 관리
              </Link>
            )}
            <IconButton label="알림">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
                <path d="M10.3 20a2 2 0 0 0 3.4 0" />
              </svg>
            </IconButton>
            <Link
              href="/account"
              aria-label="내 계정"
              className="pressable flex size-9 items-center justify-center rounded-full bg-grey-100 text-grey-600 transition-colors hover:bg-grey-250 hover:text-grey-900"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4.6 20.6c0-3.6 3.3-6 7.4-6s7.4 2.4 7.4 6" />
              </svg>
            </Link>
            <form action={signOut}>
              <button type="submit" className="px-2 text-[13px] font-semibold text-grey-500 hover:text-red-500">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className={`${CONTAINER} flex-1 pb-16 pt-6 sm:pt-8`}>
        <div className="mb-5 flex items-baseline gap-2">
          <h2 className="text-[17px] font-bold text-grey-900 sm:text-[20px]">
            {viewer.role === "student" || viewer.role === "parent"
              ? viewer.name ? `${viewer.name}님의 선생님` : "선생님"
              : viewer.isAdmin ? "전체 강사 공간" : `${viewer.name}님의 담당 공간`}
          </h2>
          <CountPill>{spaces.length}</CountPill>
          <span className="ml-auto text-[13px] text-grey-500">눌러서 들어가기</span>
        </div>

        {spaces.length === 0 ? (
          <div className="rounded-card border border-grey-200 bg-panel py-20 text-center text-[14px] text-grey-400">
            {viewer.role === "student" || viewer.role === "parent"
              ? "아직 수강 중인 수업이 없어요. 학원 데스크에 문의해 주세요."
              : "담당 공간이 없어요. 학원 관리자에게 공간 배정을 요청해 주세요."}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-x-3 gap-y-7 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {spaces.map((space) => (
              <TeacherIcon key={space.id} space={space} href={hrefOf(space)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
