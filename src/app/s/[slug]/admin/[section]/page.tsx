import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSection } from "@/components/admin/AdminSection";
import type { NavKey } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

const META: Record<string, { key: NavKey; title: string; subtitle: string }> = {
  attendance: { key: "attendance", title: "출석 관리", subtitle: "등원 QR·수기 출결을 확인하세요" },
  homework: { key: "homework", title: "숙제 관리", subtitle: "주차별 숙제 제출 현황" },
  todos: { key: "todos", title: "할 일 관리", subtitle: "재시험·제출·클리닉 예약 미완료 목록" },
  clinic: { key: "clinic", title: "클리닉 예약", subtitle: "예약·등원·하원·피드백 현황" },
  makeup: { key: "makeup", title: "보강 관리", subtitle: "결석자 보강 배정" },
  students: { key: "students", title: "학생 목록", subtitle: "재원생 검색·상세" },
  approvals: { key: "approvals", title: "계정 승인", subtitle: "앱 가입·예약 승인 큐" },
  grades: { key: "grades", title: "성적", subtitle: "주간 성적·총괄시험 집계" },
  omr: { key: "omr", title: "OMR 채점", subtitle: "정답 등록 · 학생 제출 · 조교 대리 입력" },
  videos: { key: "videos", title: "영상 관리", subtitle: "강의 영상 업로드·배정" },
};

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}) {
  const { slug, section } = await params;
  const meta = META[section];
  if (!meta) notFound();

  const space = await getSpaceBySlug(slug);
  if (!space) notFound();

  return (
    <AdminShell space={space} slug={slug} active={meta.key} title={meta.title} subtitle={meta.subtitle}>
      <AdminSection section={meta.key as Exclude<NavKey, "dash">} space={space} slug={slug} />
    </AdminShell>
  );
}
