import { redirect } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { getBranches, getCorporations } from "@/lib/hq";
import { HqShell } from "@/components/hq/HqShell";
import { TeacherForm } from "@/components/hq/TeacherForm";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function NewTeacherPage() {
  const viewer = await requireLogin("/hq/teachers/new");
  if (!viewer.isAdmin) redirect("/");
  const [branches, corporations] = await Promise.all([getBranches(), getCorporations()]);
  return (
    <HqShell active="teachers" title="강사 등록" actions={<ButtonLink href="/hq" variant="secondary" size="sm">강사 목록</ButtonLink>}>
      <TeacherForm mode="create" branches={branches} corporations={corporations} />
    </HqShell>
  );
}
