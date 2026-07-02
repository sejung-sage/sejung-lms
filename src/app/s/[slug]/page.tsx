import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
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

  const dashboard = await getDashboard({
    name: space.name,
    subject: space.subject,
    slug,
  });

  return <TeacherDashboard space={space} data={dashboard} />;
}
