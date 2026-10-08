import { notFound, redirect } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { studentContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudentHome } from "@/lib/student";
import { StudentHome } from "@/components/student/StudentHome";

export const dynamic = "force-dynamic";

/** 강좌 하나 — 이번 수업 · 숙제 · 테스트 · OMR 이 전부 이 강좌 것. 내가 듣는 강좌만 열린다 */
export default async function StudentCoursePage({ params }: { params: Promise<{ slug: string; classId: string }> }) {
  const { slug, classId } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();
  const ctx = await studentContext(space, slug);
  const db = createAdminClient();
  const [{ data: cls }, { data: member }] = await Promise.all([
    db.from("classes").select("id, title").eq("id", classId).eq("space_id", space.id).maybeSingle(),
    db.from("class_members").select("id").eq("class_id", classId).eq("student_id", ctx.student.id).maybeSingle(),
  ]);
  // 운영진 미리보기는 아무 강좌나 볼 수 있지만, 학생은 자기 강좌만
  if (!cls || (!member && !ctx.preview)) redirect(`/s/${slug}/student`);
  const data = await getStudentHome(space, ctx.student, classId);
  if (!data) notFound();
  return <StudentHome space={space} slug={slug} data={data} preview={ctx.preview} course={cls} />;
}
