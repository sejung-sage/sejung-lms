import { notFound, redirect } from "next/navigation";
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
  // 학부모 본인은 자녀 중심 화면으로 — 이 주소는 운영진 미리보기용으로 남긴다
  if (!ctx.preview) redirect(`/parent?child=${ctx.child.id}`);
  const data = await getParentHome(space, ctx.child, ctx.children);
  if (!data) notFound();

  return <ParentHome space={space} slug={slug} data={data} preview={ctx.preview} />;
}
