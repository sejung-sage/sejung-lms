import Link from "next/link";

/** 학생 앱 홈·성적 탭에서 OMR 제출로 들어가는 줄 */
export function OmrEntry({ slug }: { slug: string }) {
  return (
    <Link
      href={`/s/${slug}/student/omr`}
      className="flex items-center justify-between rounded-card border border-grey-200 bg-white px-4 py-3.5 transition-colors hover:bg-grey-50"
    >
      <div>
        <div className="text-[15px] font-semibold text-grey-900">OMR 답안 제출</div>
        <div className="text-[13px] text-grey-500">시험 답을 폰으로 마킹해요</div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-grey-400">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
