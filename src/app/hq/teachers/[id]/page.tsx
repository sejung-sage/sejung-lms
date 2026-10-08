import { notFound, redirect } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { getBranches, getClassRows, getCorporations, getHqTeacher } from "@/lib/hq";
import { HqShell } from "@/components/hq/HqShell";
import { TeacherForm } from "@/components/hq/TeacherForm";
import { TeacherAccount } from "@/components/hq/TeacherAccount";
import { ClassTable } from "@/components/classes/ClassTable";
import { Card, CardTitle, Badge } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function HqTeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireLogin(`/hq/teachers/${id}`);
  if (!viewer.isAdmin) redirect("/");
  const t = await getHqTeacher(id);
  if (!t) notFound();
  const [branches, corporations, classes] = await Promise.all([
    getBranches(), getCorporations(), getClassRows({ spaceId: id, closed: false, page: 1 }),
  ]);

  return (
    <HqShell
      active="teachers"
      title={t.name}
      subtitle={`${t.branchName} · ${t.subjects.join(", ") || "과목 없음"} · 진행 강좌 ${t.openClassCount}개 · 재원생 ${t.studentCount}명`}
      actions={
        <>
          <ButtonLink href="/hq" variant="secondary" size="sm">강사 목록</ButtonLink>
          {t.slug && <ButtonLink href={`/s/${t.slug}`} variant="primary" size="sm">강사 공간 들어가기</ButtonLink>}
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle right={t.erp ? <Badge tone="blue">ERP 연동</Badge> : <Badge>LMS 등록</Badge>}>LMS 계정 · 권한</CardTitle>
          <div className="mt-3"><TeacherAccount t={t} /></div>
        </Card>
        <div>
          <TeacherForm
            mode="edit" spaceId={t.id} branches={branches} corporations={corporations} erp={t.erp}
            value={{
              name: t.name, branchId: t.branchId, phone: t.phone, email: t.email, hiredOn: t.hiredOn,
              corporation: t.corporation, subjects: t.subjects, employment: t.employment,
            }}
          />
        </div>
      </div>

      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-grey-200 px-4 py-3">
          <span className="text-[15px] font-bold">진행 중인 강좌</span>
          <span className="num text-[13px] text-grey-500">{classes.total}</span>
        </div>
        <ClassTable rows={classes.rows} hrefOf={(r) => `/s/${r.spaceSlug}/c/${r.id}`} />
      </Card>
    </HqShell>
  );
}
