import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { studentContext } from "@/lib/auth";
import { getStudentGrade } from "@/lib/student";
import { StudentGrade } from "@/components/student/StudentGrade";

export const dynamic = "force-dynamic";

export default async function StudentGradePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();

  const ctx = await studentContext(space, slug);
  const data = await getStudentGrade(space, ctx.student);
  if (!data) notFound();

  return <StudentGrade space={space} slug={slug} data={data} preview={ctx.preview} />;
}
