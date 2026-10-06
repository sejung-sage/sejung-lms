import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { getOmrExamDetail, type OmrQuestion } from "@/lib/omr";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { OmrOpenToggle, OmrSummary, OmrSubmissionTable } from "@/components/omr/OmrAdmin";
import { AnswerKeyForm } from "@/components/omr/AnswerKeyForm";
import { StaffKeypad } from "@/components/omr/StaffKeypad";

export const dynamic = "force-dynamic";

/** 저장된 정답을 입력칸 문자열로 되돌린다 — 다섯 문항씩 띄어 쓴다 */
function keyString(qs: OmrQuestion[]) {
  const tokens = qs.map((q) => q.correct.join("/"));
  const simple = tokens.every((t) => /^\d$/.test(t));
  if (!simple) return tokens.join(" ");
  const groups: string[] = [];
  for (let i = 0; i < tokens.length; i += 5) groups.push(tokens.slice(i, i + 5).join(""));
  return groups.join(" ");
}

/** 배점이 모두 같으면 '문항당 배점' 하나로, 다르면 문항별 칸에 채운다 */
function pointsOf(qs: OmrQuestion[]) {
  if (!qs.length) return { uniform: 1, list: "" };
  const first = qs[0].points;
  return qs.every((q) => q.points === first)
    ? { uniform: first, list: "" }
    : { uniform: first, list: qs.map((q) => q.points).join(" ") };
}

export default async function OmrExamPage({
  params,
}: {
  params: Promise<{ slug: string; examId: string }>;
}) {
  const { slug, examId } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();

  const detail = await getOmrExamDetail(space, examId);
  if (!detail) notFound();
  const { exam, questions, submissions } = detail;
  const pts = pointsOf(questions);

  return (
    <AdminShell
      space={space}
      slug={slug}
      active="omr"
      title={exam.title}
      subtitle="OMR 채점 · 정답 등록 → 학생 제출 또는 조교 대리 입력"
      actions={
        <>
          <ButtonLink href={`/s/${slug}/admin/omr`} variant="ghost" size="sm">목록</ButtonLink>
          <OmrOpenToggle slug={slug} exam={exam} questionCount={questions.length} />
        </>
      }
    >
      <OmrSummary exam={exam} questions={questions} submissions={submissions} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 text-[15px] font-bold text-grey-900">정답 · 배점</div>
          <AnswerKeyForm
            slug={slug}
            examId={exam.id}
            initialKey={keyString(questions)}
            initialPoints={pts.list}
            initialDefaultPoints={pts.uniform}
            initialChoiceCount={questions[0]?.choices.length === 4 ? 4 : 5}
            hasSubmissions={submissions.some((s) => s.marks)}
          />
        </Card>
        <Card>
          <div className="mb-3 text-[15px] font-bold text-grey-900">조교 대리 입력</div>
          <StaffKeypad
            slug={slug}
            examId={exam.id}
            questions={questions}
            students={submissions.map((s) => ({ studentId: s.studentId, name: s.name, submitted: s.score != null }))}
          />
        </Card>
      </div>

      <OmrSubmissionTable questions={questions} submissions={submissions} cutoff={exam.cutoff} />
    </AdminShell>
  );
}
