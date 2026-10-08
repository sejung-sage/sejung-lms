import { redirect } from "next/navigation";

/** 옛 주소 — 강좌 화면은 /s/{slug}/c/{classId} 로 옮겼다 */
export default async function OldClassPage({ params }: { params: Promise<{ slug: string; classId: string }> }) {
  const { slug, classId } = await params;
  redirect(`/s/${slug}/c/${classId}/settings`);
}
