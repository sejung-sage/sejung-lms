import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { studentContext } from "@/lib/auth";
import { getStudentHome } from "@/lib/student";
import { StudentHome } from "@/components/student/StudentHome";

export const dynamic = "force-dynamic";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);

  if (!space) notFound();

  const ctx = await studentContext(space, slug);
  const data = await getStudentHome(space, ctx.student);

  if (!data) notFound();

  return <StudentHome space={space} slug={slug} data={data} preview={ctx.preview} />;
}
