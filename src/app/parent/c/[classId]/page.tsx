import { notFound, redirect } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { getChildren, getChildCourse } from "@/lib/family";
import { getParentHome } from "@/lib/parent";
import { ParentHome } from "@/components/parent/ParentHome";

export const dynamic = "force-dynamic";

/** 자녀의 강좌 하나 — 그 강좌의 출결 · 숙제 · 테스트 추이만 */
export default async function ParentCoursePage({
  params, searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ child?: string }>;
}) {
  const { classId } = await params;
  const { child: want } = await searchParams;
  const viewer = await requireLogin("/parent");
  const kids = await getChildren(viewer.childIds);
  // 내 자녀가 아니면 열리지 않는다
  const child = kids.find((k) => k.id === want);
  if (!child) redirect("/parent");
  const course = await getChildCourse(child.id, classId);
  if (!course) redirect(`/parent?child=${child.id}`);
  const data = await getParentHome(course.space, child, [child], classId);
  if (!data) notFound();
  return <ParentHome space={course.space} slug={course.space.slug ?? ""} data={data} course={course.title} backHref={`/parent?child=${child.id}`} />;
}
