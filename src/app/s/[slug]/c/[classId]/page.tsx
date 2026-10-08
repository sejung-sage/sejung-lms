import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { requireCourse } from "@/lib/auth";
import { getDashboard } from "@/lib/dashboard";
import { TeacherDashboard } from "@/components/TeacherDashboard";

export const dynamic = "force-dynamic";

/** 강좌 안 첫 화면 — 이 강좌만의 수업 홈 */
export default async function CourseHomePage({ params }: { params: Promise<{ slug: string; classId: string }> }) {
  const { slug, classId } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();
  const { grant, course } = await requireCourse(space, slug, classId);
  const data = await getDashboard(space, classId);
  return <TeacherDashboard space={space} slug={slug} data={data} course={course} assistant={grant.assistant} />;
}
