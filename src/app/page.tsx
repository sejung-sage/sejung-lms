import { getSpaces } from "@/lib/spaces";
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

export default async function Home() {
  const spaces = await getSpaces();

  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="sticky top-0 z-10 border-b border-grey-200 bg-white/95 backdrop-blur-sm">
        <div className={`${CONTAINER} flex items-center justify-between py-3.5`}>
          <h1 className="text-[20px] font-bold tracking-[-0.03em] text-grey-900 sm:text-[22px]">
            세정학원
          </h1>
          <div className="flex items-center gap-1.5">
            <IconButton label="알림">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
                <path d="M10.3 20a2 2 0 0 0 3.4 0" />
              </svg>
            </IconButton>
            <IconButton label="내 정보">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4.6 20.6c0-3.6 3.3-6 7.4-6s7.4 2.4 7.4 6" />
              </svg>
            </IconButton>
          </div>
        </div>
      </header>

      <main className={`${CONTAINER} flex-1 pb-16 pt-6 sm:pt-8`}>
        <div className="mb-5 flex items-baseline gap-2">
          <h2 className="text-[17px] font-bold text-grey-900 sm:text-[20px]">선생님</h2>
          <CountPill>{spaces.length}</CountPill>
          <span className="ml-auto text-[13px] text-grey-500">눌러서 들어가기</span>
        </div>

        {spaces.length === 0 ? (
          <div className="rounded-card border border-grey-200 bg-panel py-20 text-center text-[14px] text-grey-400">
            아직 등록된 쌤 공간이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-x-3 gap-y-7 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {spaces.map((space) => (
              <TeacherIcon key={space.id} space={space} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
