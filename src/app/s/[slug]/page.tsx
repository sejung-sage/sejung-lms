import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { requireStaff } from "@/lib/auth";
import { getDashboard } from "@/lib/dashboard";
import { TeacherDashboard } from "@/components/TeacherDashboard";

export const dynamic = "force-dynamic";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);

  if (!space) notFound();
  await requireStaff(space, slug);

  const dashboard = await getDashboard(space);

  return <TeacherDashboard space={space} slug={slug} data={dashboard} />;
}
