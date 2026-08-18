import { getSpaces } from "@/lib/spaces";
import { TeacherIcon } from "@/components/TeacherIcon";

// 런처는 실시간 공간 목록 → 요청 시마다 렌더 (빌드 프리렌더 X)
export const dynamic = "force-dynamic";

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full bg-grey-100 text-grey-600 transition-colors hover:bg-grey-200 active:scale-[0.96]"
    >
      {children}
    </button>
  );
}

export default async function Home() {
  const spaces = await getSpaces();

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* 상단바 */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white px-5 py-4">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-grey-900">세정학원</h1>
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
      </header>

      {/* 쌤 아이콘 그리드 */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-14 pt-2">
        <p className="mb-7 text-[15px] font-medium text-grey-500">
          선생님을 눌러 들어가세요
        </p>
        {spaces.length === 0 ? (
          <p className="mt-24 text-center text-[15px] text-grey-400">
            아직 등록된 쌤 공간이 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-x-3 gap-y-7 sm:grid-cols-5 md:grid-cols-6">
            {spaces.map((space) => (
              <TeacherIcon key={space.id} space={space} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
