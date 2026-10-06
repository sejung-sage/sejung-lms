import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { getStudentOmrSheet } from "@/lib/omr";
import { StudentFrame } from "@/components/student/StudentFrame";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { StudentOmrSheet } from "@/components/omr/StudentOmrSheet";

export const dynamic = "force-dynamic";

export default async function StudentOmrPage({
  params,
}: {
  params: Promise<{ slug: string; examId: string }>;
}) {
  const { slug, examId } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();

  const data = await getStudentOmrSheet(space, examId);
  if (!data) notFound();
  const { exam, questions, submitted } = data;

  return (
    <StudentFrame space={space} slug={slug} active="grade" pageLabel={exam.title}>
      {submitted ? (
        <Card className="text-center">
          <div className="text-[13px] font-semibold text-green-500">제출 완료</div>
          {/* 성적 공개 전에는 점수를 보여주지 않는다 — 현장 시험 중 점수가 돌면 안 되니까 */}
          {exam.scoreOpen ? (
            <div className="num mt-2 text-[34px] font-bold tracking-[-0.03em] text-grey-900">
              {submitted.score}
              <span className="text-[18px] text-grey-400">/{exam.maxScore ?? "—"}</span>
            </div>
          ) : (
            <p className="mt-2 text-[15px] text-grey-700">채점됐어요. 성적이 공개되면 성적 탭에서 확인할 수 있어요.</p>
          )}
          <ButtonLink href={`/s/${slug}/student/omr`} variant="secondary" size="md" className="mt-4">
            목록으로
          </ButtonLink>
        </Card>
      ) : !exam.omrOpen ? (
        <Card className="py-14 text-center text-[14px] text-grey-500">지금은 답안 제출 시간이 아니에요</Card>
      ) : !questions.length ? (
        <Card className="py-14 text-center text-[14px] text-grey-500">아직 답안지가 준비되지 않았어요</Card>
      ) : (
        <>
          <p className="px-1 pt-2 text-[13px] text-grey-500">
            {exam.examDate ?? ""} · {questions.length}문항 · 한 번 제출하면 수정할 수 없어요
          </p>
          <StudentOmrSheet slug={slug} examId={exam.id} questions={questions} />
        </>
      )}
    </StudentFrame>
  );
}
