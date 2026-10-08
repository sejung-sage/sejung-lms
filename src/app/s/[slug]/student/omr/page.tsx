import Link from "next/link";
import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { studentContext } from "@/lib/auth";
import { getStudentOmrList, omrAvailable } from "@/lib/omr";
import { StudentFrame } from "@/components/student/StudentFrame";
import { Card, Badge } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function StudentOmrListPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ class?: string }>;
}) {
  const { slug } = await params;
  const { class: classId } = await searchParams;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();

  const ctx = await studentContext(space, slug);
  const data = omrAvailable ? await getStudentOmrList(space, ctx.student, classId) : null;

  return (
    <StudentFrame space={space} slug={slug} active="grade" pageLabel="OMR 답안 제출" preview={ctx.preview}>
      {!data || !data.rows.length ? (
        <Card className="py-14 text-center text-[14px] text-grey-500">지금 제출할 시험이 없어요</Card>
      ) : (
        <div className="divide-y divide-grey-100 rounded-card border border-grey-200 bg-white">
          {data.rows.map((e) => (
            <Link
              key={e.id}
              href={`/s/${slug}/student/omr/${e.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-grey-50"
            >
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-grey-900">{e.title}</div>
                <div className="num mt-0.5 text-[13px] text-grey-500">
                  {e.examDate ?? "시험일 미정"} · {e.questionCount}문항
                </div>
              </div>
              {e.submittedAt ? <Badge tone="green">제출 완료</Badge> : <Badge tone="blue">제출하기</Badge>}
            </Link>
          ))}
        </div>
      )}
    </StudentFrame>
  );
}
