import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { requireStaff } from "@/lib/auth";
import { getOmrExamDetail } from "@/lib/omr";
import { AdminShell } from "@/components/admin/AdminShell";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScanReview } from "@/components/omr/ScanReview";

export const dynamic = "force-dynamic";

export default async function OmrScanPage({
  params,
}: {
  params: Promise<{ slug: string; examId: string }>;
}) {
  const { slug, examId } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();
  await requireStaff(space, slug);
  const detail = await getOmrExamDetail(space, examId);
  if (!detail) notFound();
  const { exam, questions, submissions } = detail;

  return (
    <AdminShell
      space={space}
      slug={slug}
      active="omr"
      title={`${exam.title} · 스캔`}
      subtitle="종이 답안지 스캔 → 자동 인식 → 검수 → 확정 저장"
      actions={<ButtonLink href={`/s/${slug}/admin/omr/${exam.id}`} variant="ghost" size="sm">시험으로</ButtonLink>}
    >
      {!questions.length ? (
        <Card className="py-14 text-center text-[14px] text-grey-500">정답을 먼저 등록해 주세요</Card>
      ) : (
        <>
          <Card className="text-[13px] leading-relaxed text-grey-600">
            이 시험용으로 인쇄한 답안지만 읽을 수 있어요. 스캐너는 <b>흑백 또는 회색조 · 200dpi</b> 이상,
            여러 장은 PDF 하나로 묶어 올리면 편해요. 노란 칸(중복·연한 마킹)을 모두 확인해야 저장할 수 있어요.
          </Card>
          <ScanReview
            slug={slug}
            examId={exam.id}
            questions={questions.map((q) => ({ no: q.no, choices: q.choices }))}
            students={submissions.map((s) => ({ id: s.studentId, name: s.name, hasScore: s.score != null }))}
          />
        </>
      )}
    </AdminShell>
  );
}
