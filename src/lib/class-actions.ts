"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSpaceBySlug } from "@/lib/spaces";
import { staffForAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureStaffAccount, addAssistantToClass } from "@/lib/staff";
import type { StaffActionState } from "@/lib/hq-actions";

/**
 * 강사 — 강좌 만들기, 조교 배정, 수강생 배정.
 * 학생 관리 권한(주 강사·학원 관리자·권한 받은 공동 강사)만. 조교는 보기만 한다.
 * 강좌는 항상 '이 공간의 강좌'인지 다시 확인한다.
 */

const fail = (message: string): StaffActionState => ({ ok: false, message, at: Date.now() });
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function manager(slug: string) {
  const space = await getSpaceBySlug(slug);
  if (!space?.id) return null;
  const st = await staffForAction(space.id);
  return st?.grant.canManage ? space : null;
}

async function classOf(spaceId: string, classId: string) {
  const { data } = await createAdminClient().from("classes").select("id").eq("id", classId).eq("space_id", spaceId).maybeSingle();
  return data?.id ?? null;
}

const paths = (slug: string, classId?: string) => {
  revalidatePath(`/s/${slug}/admin/classes`);
  if (classId) revalidatePath(`/s/${slug}/admin/classes/${classId}`);
};

export async function createClass(slug: string, _prev: StaffActionState, form: FormData): Promise<StaffActionState> {
  const space = await manager(slug);
  if (!space) return fail("강좌를 만들 권한이 없어요");
  const title = str(form, "title");
  if (!title) return fail("강좌 이름을 적어 주세요");
  const { data, error } = await createAdminClient().from("classes")
    .insert({ space_id: space.id, title, description: str(form, "description") || null }).select("id").single();
  if (error) return fail(error.message);
  paths(slug);
  redirect(`/s/${slug}/admin/classes/${data.id}`);
}

export async function updateClass(slug: string, classId: string, _prev: StaffActionState, form: FormData): Promise<StaffActionState> {
  const space = await manager(slug);
  if (!space || !(await classOf(space.id, classId))) return fail("권한이 없어요");
  const title = str(form, "title");
  if (!title) return fail("강좌 이름을 적어 주세요");
  const { error } = await createAdminClient().from("classes")
    .update({ title, description: str(form, "description") || null }).eq("id", classId);
  if (error) return fail(error.message);
  paths(slug, classId);
  return { ok: true, message: "저장했어요", at: Date.now() };
}

/** 새 조교 등록(이메일) 또는 이 공간의 기존 조교를 강좌에 배정 */
export async function assignAssistant(slug: string, classId: string, _prev: StaffActionState, form: FormData): Promise<StaffActionState> {
  const space = await manager(slug);
  if (!space || !(await classOf(space.id, classId))) return fail("조교를 배정할 권한이 없어요");
  try {
    const existing = str(form, "assistantId");
    if (existing) {
      // 화면에서 보낸 id 가 정말 이 공간 조교인지 확인
      const { data } = await createAdminClient().from("space_staff").select("profile_id")
        .eq("space_id", space.id).eq("profile_id", existing).eq("staff_role", "assistant").maybeSingle();
      if (!data) return fail("이 공간의 조교가 아니에요");
      await addAssistantToClass(space.id, classId, existing);
      paths(slug, classId);
      return { ok: true, message: "배정했어요", at: Date.now() };
    }
    const acc = await ensureStaffAccount(str(form, "email"), str(form, "name"), "assistant");
    await addAssistantToClass(space.id, classId, acc.userId);
    paths(slug, classId);
    return {
      ok: true,
      at: Date.now(),
      message: acc.created ? `${acc.name} 조교 계정을 만들고 배정했어요` : `${acc.name} 님을 배정했어요 (기존 계정)`,
      credential: acc.password ? { name: acc.name, email: acc.email, password: acc.password } : undefined,
    };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "배정하지 못했어요");
  }
}

export async function unassignAssistant(slug: string, classId: string, profileId: string): Promise<void> {
  const space = await manager(slug);
  if (!space || !(await classOf(space.id, classId))) return;
  await createAdminClient().from("class_staff").delete().eq("class_id", classId).eq("profile_id", profileId);
  paths(slug, classId);
}

/** 수강생 명단 저장 — 체크된 학생만 남긴다. 이 공간 재원생이 아닌 id 는 버린다 */
export async function saveClassMembers(slug: string, classId: string, _prev: StaffActionState, form: FormData): Promise<StaffActionState> {
  const space = await manager(slug);
  if (!space || !(await classOf(space.id, classId))) return fail("권한이 없어요");
  const db = createAdminClient();
  const { data: enr } = await db.from("enrollments").select("student_id").eq("space_id", space.id).eq("status", "active");
  const allowed = new Set((enr ?? []).map((e) => e.student_id));
  const picked = form.getAll("student").map(String).filter((id) => allowed.has(id));

  const { error: delErr } = await db.from("class_members").delete().eq("class_id", classId);
  if (delErr) return fail(delErr.message);
  if (picked.length) {
    const { error } = await db.from("class_members").insert(picked.map((student_id) => ({ class_id: classId, space_id: space.id, student_id })));
    if (error) return fail(error.message);
  }
  paths(slug, classId);
  return { ok: true, message: `수강생 ${picked.length}명으로 저장했어요`, at: Date.now() };
}
