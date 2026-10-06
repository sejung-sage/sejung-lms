import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { studentContext } from "@/lib/auth";
import { StudentFrame } from "@/components/student/StudentFrame";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

const MENUS = [
  { t: "강의 영상", d: "영상으로 복습", i: "🎬" },
  { t: "학습 자료실", d: "수업 자료 모음", i: "📚" },
];

export default async function StudentLearnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();
  const ctx = await studentContext(space, slug);

  return (
    <StudentFrame space={space} slug={slug} active="learn" pageLabel="학습" preview={ctx.preview}>
      <div className="grid grid-cols-2 gap-3 pt-2">
        {MENUS.map((c) => (
          <Card key={c.t} className="p-5">
            <div className="flex size-11 items-center justify-center rounded-[14px] bg-grey-50 text-[20px]">
              {c.i}
            </div>
            <div className="mt-3 text-[16px] font-bold text-grey-900">{c.t}</div>
            <div className="mt-0.5 text-[13px] text-grey-500">{c.d}</div>
          </Card>
        ))}
      </div>
      <p className="pt-5 text-center text-[13px] text-grey-400">학습 콘텐츠 화면 준비 중</p>
    </StudentFrame>
  );
}
