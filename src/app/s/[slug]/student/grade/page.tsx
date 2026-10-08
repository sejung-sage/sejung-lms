import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { studentContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudentGrade } from "@/lib/student";
import { StudentGrade } from "@/components/student/StudentGrade";

export const dynamic = "force-dynamic";

/** 성적 — 강좌별로 (내가 듣는 강좌만 칩으로) */
export default async function StudentGradePage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ class?: string }>;
}) {
  const { slug } = await params;
  const { class: want } = await searchParams;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();

  const ctx = await studentContext(space, slug);
  const { data: mem } = await createAdminClient().from("class_members")
    .select("classes!inner(id, title)").eq("space_id", space.id).eq("student_id", ctx.student.id);
  type C = { id: string; title: string };
  const courses = (mem ?? []).flatMap((m: { classes: C | C[] }) => (Array.isArray(m.classes) ? m.classes : [m.classes]));
  const active = courses.find((c) => c.id === want)?.id ?? courses[0]?.id ?? null;
  const data = await getStudentGrade(space, ctx.student, active ?? undefined);
  if (!data) notFound();

  return <StudentGrade space={space} slug={slug} data={data} preview={ctx.preview} courses={courses} active={active} />;
}
