import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { parentContext } from "@/lib/auth";
import { getParentHome } from "@/lib/parent";
import { ParentHome } from "@/components/parent/ParentHome";

export const dynamic = "force-dynamic";

export default async function ParentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();

  const ctx = await parentContext(space, slug);
  const data = await getParentHome(space, ctx.child, ctx.children);
  if (!data) notFound();

  return <ParentHome space={space} slug={slug} data={data} preview={ctx.preview} />;
}
