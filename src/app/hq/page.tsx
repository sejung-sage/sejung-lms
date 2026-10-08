import { redirect } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { getBranches, getHqTeachers } from "@/lib/hq";
import { HqShell } from "@/components/hq/HqShell";
import { TeacherList } from "@/components/hq/TeacherList";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

/** 학원 관리자(마스터) — ERP 강사 목록 + LMS 계정 */
export default async function HqTeachersPage() {
  const viewer = await requireLogin("/hq");
  if (!viewer.isAdmin) redirect("/");
  const [teachers, branches] = await Promise.all([getHqTeachers(), getBranches()]);
  const withAccount = teachers.filter((t) => t.owner).length;

  return (
    <HqShell
      active="teachers"
      title="강사"
      subtitle={`강사 ${teachers.length}명 · LMS 계정 발급 ${withAccount}명 — 강사를 눌러 계정·권한·강좌를 관리해요`}
      actions={<ButtonLink href="/hq/teachers/new" variant="primary" size="sm">강사 등록</ButtonLink>}
    >
      <TeacherList teachers={teachers} branches={branches} defaultBranch={branches[0]?.id ?? ""} />
    </HqShell>
  );
}
