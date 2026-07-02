import { getSpaces } from "@/lib/spaces";
import { TeacherIcon } from "@/components/TeacherIcon";

// 런처는 실시간 공간 목록 → 요청 시마다 렌더 (빌드 프리렌더 X)
export const dynamic = "force-dynamic";

export default async function Home() {
  const spaces = await getSpaces();

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-[#F3F1FC] via-[#F6F5FB] to-[#EEF2FB] dark:from-zinc-950 dark:via-black dark:to-zinc-950">
      {/* 상단바 */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white shadow-sm">
            세
          </div>
          <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            세정학원
          </h1>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <button className="flex size-9 items-center justify-center rounded-full bg-white/70 shadow-sm ring-1 ring-black/5 transition hover:bg-white dark:bg-zinc-800/70 dark:ring-white/5">
            🔔
          </button>
          <button className="flex size-9 items-center justify-center rounded-full bg-white/70 shadow-sm ring-1 ring-black/5 transition hover:bg-white dark:bg-zinc-800/70 dark:ring-white/5">
            👤
          </button>
        </div>
      </header>

      {/* 쌤 아이콘 그리드 */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-12 pt-4">
        <p className="mb-6 px-1 text-sm font-medium text-zinc-400">
          선생님을 눌러 들어가세요
        </p>
        {spaces.length === 0 ? (
          <p className="mt-20 text-center text-sm text-zinc-400">
            아직 등록된 쌤 공간이 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-6">
            {spaces.map((space) => (
              <TeacherIcon key={space.id} space={space} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
