import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { StudentFrame } from "@/components/student/StudentFrame";

export const dynamic = "force-dynamic";

export default async function StudentLearnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();

  return (
    <StudentFrame space={space} slug={slug} active="learn" pageLabel="학습">
      <div className="grid grid-cols-2 gap-3 pt-2">
        {[
          { t: "강의 영상", d: "영상으로 복습", i: "🎬" },
          { t: "학습 자료실", d: "수업 자료 모음", i: "📚" },
        ].map((c) => (
          <div key={c.t} className="rounded-3xl bg-white/90 p-5 text-center shadow-[0_8px_30px_-14px_rgba(60,50,120,0.18)] ring-1 ring-black/[0.04]">
            <div className="text-3xl">{c.i}</div>
            <div className="mt-2 text-sm font-bold text-slate-800">{c.t}</div>
            <div className="text-[11px] text-slate-400">{c.d}</div>
          </div>
        ))}
      </div>
      <p className="pt-4 text-center text-xs text-slate-400">학습 콘텐츠 화면 준비 중</p>
    </StudentFrame>
  );
}
