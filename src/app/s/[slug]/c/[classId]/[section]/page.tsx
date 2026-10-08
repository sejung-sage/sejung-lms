import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { requireCourse } from "@/lib/auth";
import { getClassDetail } from "@/lib/staff";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSection } from "@/components/admin/AdminSection";
import { SECTION_META, COURSE_SECTIONS } from "@/components/admin/sections";
import { CourseSettings } from "@/components/classes/CourseSettings";
import type { NavKey } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

/** 강좌 안 화면 — 출석 · 숙제 · 할 일 · 클리닉 · 성적 · OMR · 수강생 · 강좌 설정 (전부 이 강좌만) */
export default async function CourseSectionPage({ params }: { params: Promise<{ slug: string; classId: string; section: string }> }) {
  const { slug, classId, section } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();
  const { grant, course } = await requireCourse(space, slug, classId);

  if (section === "settings") {
    const cls = await getClassDetail(space.id, classId);
    if (!cls) notFound();
    return (
      <AdminShell space={space} slug={slug} active="settings" course={course} assistant={grant.assistant}
        title="강좌 설정"
        subtitle={grant.canManage ? "강좌 정보 · 담당 조교 · 수강생 명단" : "보기 전용 — 강좌 설정은 강사만 바꿀 수 있어요"}>
        <CourseSettings slug={slug} cls={cls} canManage={grant.canManage} />
      </AdminShell>
    );
  }

  if (!COURSE_SECTIONS.has(section)) notFound();
  const meta = section === "students"
    ? { key: "students" as NavKey, title: "수강생", subtitle: "이 강좌 수강생의 출석률 · 숙제율" }
    : SECTION_META[section];

  return (
    <AdminShell space={space} slug={slug} active={meta.key} course={course} assistant={grant.assistant} title={meta.title} subtitle={meta.subtitle}>
      <AdminSection section={meta.key as Exclude<NavKey, "dash">} space={space} slug={slug} classId={classId} />
    </AdminShell>
  );
}
