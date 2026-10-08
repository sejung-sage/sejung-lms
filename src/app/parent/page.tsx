import { redirect } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { getChildren, getChildCourses } from "@/lib/family";
import { ParentFamily } from "@/components/parent/ParentFamily";

export const dynamic = "force-dynamic";

/** 학부모 첫 화면 — 자녀를 고르면 그 자녀가 듣는 모든 강좌가 강좌별로 */
export default async function ParentFamilyPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const viewer = await requireLogin("/parent");
  const kids = await getChildren(viewer.childIds);
  if (!kids.length) redirect("/");
  const { child: want } = await searchParams;
  const child = kids.find((k) => k.id === want) ?? kids[0];
  const courses = await getChildCourses(child.id);
  return (
    <ParentFamily
      kids={kids} child={child} courses={courses}
      childHref={(id) => `/parent?child=${id}`}
      courseHref={(classId) => `/parent/c/${classId}?child=${child.id}`}
    />
  );
}
