import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { requireStaff, staffGrant, visibleClassIds } from "@/lib/auth";
import { getSpaceCourses } from "@/lib/course";
import { AdminShell } from "@/components/admin/AdminShell";
import { CourseCards } from "@/components/admin/CourseCards";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

/** 강사 앱 첫 화면 — 강좌를 고른다. 조교는 배정받은 강좌만 보인다 */
export default async function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();
  const viewer = await requireStaff(space, slug);
  const grant = staffGrant(viewer, space.id)!;
  const courses = await getSpaceCourses(space.id, await visibleClassIds(viewer, space.id));
  const open = courses.filter((c) => !c.isClosed);
  const closed = courses.filter((c) => c.isClosed);

  return (
    <AdminShell
      space={space} slug={slug} active="dash" assistant={grant.assistant}
      title="강좌"
      subtitle={grant.assistant ? "배정받은 강좌만 보여요 · 강좌를 눌러 들어가세요" : `진행 강좌 ${open.length}개 · 강좌를 눌러 출석·숙제·성적을 관리하세요`}
      actions={grant.canManage ? <ButtonLink href={`/s/${slug}/admin/classes/new`} variant="primary" size="sm">강좌 개설</ButtonLink> : undefined}
    >
      {courses.length === 0 ? (
        <div className="rounded-card border border-grey-200 bg-white py-20 text-center text-[14px] text-grey-400">
          {grant.assistant ? "아직 배정받은 강좌가 없어요. 담당 강사에게 배정을 요청해 주세요." : "아직 강좌가 없어요. '강좌 개설'로 첫 강좌를 만들어 주세요."}
        </div>
      ) : (
        <>
          <CourseCards slug={slug} courses={open} accent={space.accent_color} />
          {closed.length > 0 && (
            <>
              <h2 className="pt-3 text-[15px] font-bold text-grey-600">종강한 강좌</h2>
              <CourseCards slug={slug} courses={closed} accent={space.accent_color} />
            </>
          )}
        </>
      )}
    </AdminShell>
  );
}
