import Link from "next/link";
import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";

export const dynamic = "force-dynamic";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);

  if (!space) notFound();

  return (
    <div className="flex flex-1 flex-col">
      {/* 쌤 테마색 진입 헤더 */}
      <div
        className="flex flex-col gap-1 px-6 pb-8 pt-10 text-white"
        style={{ backgroundColor: space.accent_color }}
      >
        <Link href="/" className="mb-4 text-sm text-white/80 hover:text-white">
          ← 세정학원
        </Link>
        <h1 className="text-2xl font-bold">{space.name}</h1>
        {space.subject && <p className="text-white/80">{space.subject}</p>}
      </div>

      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
        <p className="text-center text-sm text-zinc-400">
          {space.name} 공간 — 대시보드/성적/숙제 화면이 곧 연결됩니다.
        </p>
      </div>
    </div>
  );
}
