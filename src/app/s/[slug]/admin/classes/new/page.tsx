import { notFound, redirect } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { requireStaff, staffGrant } from "@/lib/auth";
import { createClass } from "@/lib/class-actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { ClassForm } from "@/components/classes/ClassForm";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function NewClassPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();
  const viewer = await requireStaff(space, slug);
  if (!staffGrant(viewer, space.id)?.canManage) redirect(`/s/${slug}/admin/classes`);
  return (
    <AdminShell
      space={space} slug={slug} active="classes" title="강좌 개설"
      actions={<ButtonLink href={`/s/${slug}/admin/classes`} variant="secondary" size="sm">강좌 목록</ButtonLink>}
    >
      <ClassForm action={createClass.bind(null, slug)} submitLabel="강좌 개설" />
    </AdminShell>
  );
}
