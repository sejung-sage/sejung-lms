export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-blue-600 text-2xl font-bold text-white shadow-lg">
          세정
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            세정학원 LMS
          </h1>
          <p className="text-base leading-7 text-zinc-500 dark:text-zinc-400">
            선생님마다 자기 공간을 갖는 학습 관리 시스템.
            <br />
            환경 구성 완료 — 곧 홈 런처가 열립니다.
          </p>
        </div>
        <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          v0.1 · 배포 확인용
        </span>
      </main>
    </div>
  );
}
