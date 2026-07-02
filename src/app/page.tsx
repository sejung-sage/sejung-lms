import { getSpaces } from "@/lib/spaces";
import { TeacherIcon } from "@/components/TeacherIcon";

// 런처는 실시간 공간 목록 → 요청 시마다 렌더 (빌드 프리렌더 X)
export const dynamic = "force-dynamic";

export default async function Home() {
  const spaces = await getSpaces();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      {/* 상단바 */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-zinc-50/80 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-black/80">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          세정학원
        </h1>
        <div className="flex items-center gap-3 text-zinc-400">
          <span className="text-xl">🔔</span>
          <span className="text-xl">👤</span>
        </div>
      </header>

      {/* 쌤 아이콘 그리드 */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
        {spaces.length === 0 ? (
          <p className="mt-20 text-center text-sm text-zinc-400">
            아직 등록된 쌤 공간이 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4 md:grid-cols-6">
            {spaces.map((space) => (
              <TeacherIcon key={space.id} space={space} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
