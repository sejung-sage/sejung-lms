import { redirect } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { getTeacherOptions } from "@/lib/hq";
import { hqCreateClass } from "@/lib/hq-actions";
import { HqShell } from "@/components/hq/HqShell";
import { ClassForm } from "@/components/classes/ClassForm";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function HqNewClassPage() {
  const viewer = await requireLogin("/hq/classes/new");
  if (!viewer.isAdmin) redirect("/");
  const teachers = await getTeacherOptions();
  return (
    <HqShell active="classes" title="강좌 개설" actions={<ButtonLink href="/hq/classes" variant="secondary" size="sm">강좌 목록</ButtonLink>}>
      <ClassForm action={hqCreateClass} teachers={teachers} submitLabel="강좌 개설" />
    </HqShell>
  );
}
