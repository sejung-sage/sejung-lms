import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { studentContext } from "@/lib/auth";
import { getStudentCourses, getStudentTodos } from "@/lib/student";
import { StudentCourses } from "@/components/student/StudentCourses";

export const dynamic = "force-dynamic";

/** 학생 앱 첫 화면 — 이 선생님에게서 듣는 내 강좌 */
export default async function StudentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();
  const ctx = await studentContext(space, slug);
  const [courses, todos] = await Promise.all([getStudentCourses(space, ctx.student), getStudentTodos(space, ctx.student)]);
  return <StudentCourses space={space} slug={slug} courses={courses} todos={todos} preview={ctx.preview} />;
}
