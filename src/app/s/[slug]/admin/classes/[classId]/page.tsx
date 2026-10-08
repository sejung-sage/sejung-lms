import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { requireStaff, staffGrant } from "@/lib/auth";
import { getClassDetail } from "@/lib/staff";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { ClassInfoForm, AssistantPanel, MembersForm } from "@/components/classes/ClassForms";

export const dynamic = "force-dynamic";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ slug: string; classId: string }>;
}) {
  const { slug, classId } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();
  const viewer = await requireStaff(space, slug);
  const cls = await getClassDetail(space.id, classId);
  if (!cls) notFound();
  const canManage = !!staffGrant(viewer, space.id)?.canManage;

  return (
    <AdminShell
      space={space} slug={slug} active="classes"
      title={cls.title}
      subtitle={canManage ? "강좌 정보 · 담당 조교 · 수강생" : "보기 전용 — 강좌 설정은 강사만 바꿀 수 있어요"}
      actions={<ButtonLink href={`/s/${slug}/admin/classes`} variant="secondary" size="sm">강좌 목록</ButtonLink>}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card>
          <CardTitle>강좌 정보</CardTitle>
          <div className="mt-3"><ClassInfoForm slug={slug} cls={cls} canManage={canManage} /></div>
        </Card>
        <Card padded={false}>
          <div className="border-b border-grey-200 px-4 py-3">
            <span className="text-[15px] font-bold text-grey-900">담당 조교</span>
          </div>
          <AssistantPanel slug={slug} cls={cls} canManage={canManage} />
        </Card>
      </div>

      <Card padded={false}>
        <div className="border-b border-grey-200 px-4 py-3">
          <span className="text-[15px] font-bold text-grey-900">수강생</span>
        </div>
        <MembersForm slug={slug} cls={cls} canManage={canManage} />
      </Card>
    </AdminShell>
  );
}
