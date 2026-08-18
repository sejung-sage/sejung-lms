import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { StudentFrame } from "@/components/student/StudentFrame";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

const MENU = ["내 정보", "출결 내역", "알림 설정", "학부모 연결", "로그아웃"];

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export default async function StudentMyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();

  return (
    <StudentFrame space={space} slug={slug} active="my" pageLabel="마이">
      <Card className="mt-1 flex items-center gap-3.5">
        <div
          className="flex size-14 items-center justify-center rounded-full text-[20px] font-bold text-white"
          style={{ backgroundColor: space.accent_color }}
        >
          이
        </div>
        <div>
          <div className="text-[18px] font-bold text-grey-900">이서준</div>
          <div className="text-[13px] text-grey-500">{space.subject} · 고1</div>
        </div>
      </Card>

      <Card padded={false}>
        <ul className="divide-y divide-grey-100">
          {MENU.map((m) => (
            <li key={m}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-5 py-4 text-left text-[15px] font-medium text-grey-800 transition-colors hover:bg-grey-50"
              >
                {m}
                <span className="text-grey-300">
                  <Chevron />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <p className="pt-3 text-center text-[13px] text-grey-400">마이 화면 준비 중</p>
    </StudentFrame>
  );
}
