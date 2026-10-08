import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { requireStaff, staffGrant } from "@/lib/auth";
import { getClassDetail } from "@/lib/staff";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { AssistantPanel, MembersForm } from "@/components/classes/ClassForms";
import { ClassForm } from "@/components/classes/ClassForm";
import { updateClass } from "@/lib/class-actions";
import { Badge } from "@/components/ui/Card";

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
      subtitle={`${cls.subject ?? ""} · ${cls.kind === "special" ? "특강" : "정규"} · 수강생 ${cls.members.length}명${canManage ? "" : " · 보기 전용 — 강좌 설정은 강사만 바꿀 수 있어요"}`}
      actions={<ButtonLink href={`/s/${slug}/admin/classes`} variant="secondary" size="sm">강좌 목록</ButtonLink>}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          {cls.erp && (
            <p className="flex items-center gap-2 rounded-md bg-blue-50 px-4 py-3 text-[13px] leading-[1.6] text-blue-600">
              <Badge tone="blue">ERP 연동</Badge>
              ERP에서 가져온 강좌예요. 강좌 정보·수강생 명단은 ERP 동기화 때 ERP 값으로 맞춰져요. 조교 배정은 LMS에서만 해요.
            </p>
          )}
          <ClassForm
            action={updateClass.bind(null, slug, cls.id)} submitLabel="저장" readOnly={!canManage}
            value={{
              title: cls.title, subject: cls.subject, subjectDetail: cls.subjectDetail, kind: cls.kind,
              description: cls.description, startsOn: cls.startsOn, endsOn: cls.endsOn, totalSessions: cls.totalSessions,
              pricePerSession: cls.pricePerSession, capacity: cls.capacity, isClosed: cls.isClosed, slots: cls.slots,
            }}
          />
        </div>
        <Card padded={false} className="h-fit">
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
