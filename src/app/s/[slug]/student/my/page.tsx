import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { StudentFrame } from "@/components/student/StudentFrame";

export const dynamic = "force-dynamic";

export default async function StudentMyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();

  const menu = ["내 정보", "출결 내역", "알림 설정", "학부모 연결", "로그아웃"];

  return (
    <StudentFrame space={space} slug={slug} active="my" pageLabel="마이">
      <div className="flex items-center gap-3 rounded-3xl bg-white/90 p-5 shadow-[0_8px_30px_-14px_rgba(60,50,120,0.18)] ring-1 ring-black/[0.04]">
        <div className="flex size-12 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: `linear-gradient(145deg, ${space.accent_color}, ${space.accent_color}c0)` }}>이</div>
        <div>
          <div className="text-sm font-bold text-slate-800">이서준</div>
          <div className="text-[11px] text-slate-400">{space.subject} · 고1</div>
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl bg-white/90 shadow-[0_8px_30px_-14px_rgba(60,50,120,0.18)] ring-1 ring-black/[0.04]">
        {menu.map((m) => (
          <div key={m} className="flex items-center justify-between border-b border-slate-50 px-5 py-3.5 text-sm text-slate-600 last:border-0">
            {m}<span className="text-slate-300">›</span>
          </div>
        ))}
      </div>
      <p className="pt-2 text-center text-xs text-slate-400">마이 화면 준비 중</p>
    </StudentFrame>
  );
}
