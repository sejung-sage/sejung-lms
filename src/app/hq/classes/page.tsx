import { redirect } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { getBranches, getClassRows, CLASS_PAGE } from "@/lib/hq";
import { HqShell } from "@/components/hq/HqShell";
import { ClassTable } from "@/components/classes/ClassTable";
import { ClassFilters, Pager, type ClassParams } from "@/components/classes/ClassFilters";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

/** 전체 강좌 — ERP 강좌 목록과 같은 열 · 같은 필터 */
export default async function HqClassesPage({ searchParams }: { searchParams: Promise<ClassParams> }) {
  const viewer = await requireLogin("/hq/classes");
  if (!viewer.isAdmin) redirect("/");
  const sp = await searchParams;
  const branches = await getBranches();
  const params: ClassParams = { ...sp, branch: sp.branch ?? branches[0]?.id };
  const page = Number(params.page) || 1;
  const { rows, total } = await getClassRows({
    branchId: params.branch || undefined, subject: params.subject, kind: params.kind, q: params.q,
    closed: params.closed === "1", page,
  });

  return (
    <HqShell
      active="classes"
      title="강좌"
      subtitle="강좌를 누르면 그 강사 공간의 강좌 화면(수강생 · 조교 배정)으로 가요"
      actions={<ButtonLink href="/hq/classes/new" variant="primary" size="sm">강좌 개설</ButtonLink>}
    >
      <div className="rounded-card border border-grey-200 bg-white">
        <ClassFilters params={params} branches={branches} base="/hq/classes" />
        <ClassTable rows={rows} showTeacher hrefOf={(r) => `/s/${r.spaceSlug}/c/${r.id}`} />
        <Pager total={total} page={page} size={CLASS_PAGE} base="/hq/classes" params={params} />
      </div>
    </HqShell>
  );
}
