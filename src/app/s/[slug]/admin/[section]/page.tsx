import { notFound, redirect } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { requireStaff, staffGrant } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSection } from "@/components/admin/AdminSection";
import { SECTION_META, SPACE_SECTIONS } from "@/components/admin/sections";
import type { NavKey } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

/**
 * 강사 공간 단위 화면 — 학생(전체 명단·계정·리포트 링크) · 승인 · 영상.
 * 출석·숙제·성적·OMR 같은 수업 운영은 강좌 안(/s/{slug}/c/{classId})으로 옮겼다 — 옛 주소는 강좌 목록으로 보낸다.
 */
export default async function AdminSectionPage({ params }: { params: Promise<{ slug: string; section: string }> }) {
  const { slug, section } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();
  const viewer = await requireStaff(space, slug);

  if (!SPACE_SECTIONS.has(section)) redirect(`/s/${slug}`);
  const assistant = !!staffGrant(viewer, space.id)?.assistant;
  // 조교는 배정받은 강좌 안에서만 일한다 — 공간 전체 학생 명단은 강사 몫
  if (assistant) redirect(`/s/${slug}`);
  const meta = SECTION_META[section];

  return (
    <AdminShell space={space} slug={slug} active={meta.key} title={meta.title} subtitle={meta.subtitle}>
      <AdminSection section={meta.key as Exclude<NavKey, "dash">} space={space} slug={slug} />
    </AdminShell>
  );
}
