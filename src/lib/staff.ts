import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { tempPassword } from "@/lib/accounts";
import { selectAll } from "@/lib/db-all";
import type { Slot } from "@/lib/hq";

/**
 * 운영진(강사·조교) 계정과 공간·강좌 배정.
 *
 * 누가 무엇을 할 수 있는지(학원 관리자만 강사를, 강사만 조교를)는 액션 쪽에서 막고,
 * 여기는 '계정을 만들거나 찾고, 배정 row 를 쓰는' 일만 한다.
 */

const db = () => createAdminClient();

type StaffRole = "admin" | "teacher" | "assistant";
const RANK: Record<string, number> = { assistant: 1, teacher: 2, admin: 3 };

export type StaffAccount = { userId: string; name: string; email: string; password: string | null; created: boolean };

async function findUserByEmail(email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await db().auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`사용자 조회 실패: ${error.message}`);
    const u = data.users.find((x) => x.email === email);
    if (u) return u;
    if (data.users.length < 200) return null;
  }
}

/**
 * 이메일로 운영진 계정을 만들거나 찾는다.
 * 이미 있으면 비밀번호는 그대로 두고, 역할은 올리기만 한다(강사를 조교로 내리지 않는다).
 * 학생·학부모 계정은 운영진으로 바꾸지 않는다.
 */
export async function ensureStaffAccount(rawEmail: string, rawName: string, role: StaffRole): Promise<StaffAccount> {
  const email = rawEmail.trim().toLowerCase();
  const name = rawName.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("이메일 형식이 아니에요");
  if (!name) throw new Error("이름을 적어 주세요");

  const existing = await findUserByEmail(email);
  if (existing) {
    const { data: prof } = await db().from("profiles").select("role, full_name").eq("id", existing.id).maybeSingle();
    const cur = prof?.role ?? "student";
    if (!(cur in RANK)) throw new Error("학생·학부모 계정으로 쓰이는 이메일이에요");
    if (RANK[role] > RANK[cur]) {
      const { error } = await db().auth.admin.updateUserById(existing.id, { app_metadata: { role } });
      if (error) throw new Error(`역할 변경 실패: ${error.message}`);
      await db().from("profiles").update({ role }).eq("id", existing.id);
    }
    return { userId: existing.id, name: prof?.full_name ?? name, email, password: null, created: false };
  }

  const password = tempPassword(10);
  const { data, error } = await db().auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: name, must_change_password: true },
  });
  if (error || !data.user) throw new Error(`계정을 만들지 못했어요: ${error?.message ?? ""}`);
  await db().from("profiles").update({ role, full_name: name, login_id: email }).eq("id", data.user.id);
  return { userId: data.user.id, name, email, password, created: true };
}

export async function resetStaffPassword(userId: string) {
  const password = tempPassword(10);
  const { error } = await db().auth.admin.updateUserById(userId, { password, user_metadata: { must_change_password: true } });
  if (error) throw new Error(`비밀번호를 바꾸지 못했어요: ${error.message}`);
  return password;
}

/* ── 학원 관리자: 강사 ↔ 공간 ─────────────────────── */

/** 공간이 비어 있으면 주 강사로, 이미 주 강사가 있으면 공동 강사로 붙인다 */
export async function grantTeacherSpace(userId: string, spaceId: string, canManage = true) {
  const { data: sp } = await db().from("teacher_spaces").select("owner_id").eq("id", spaceId).maybeSingle();
  if (!sp) throw new Error("없는 공간이에요");
  if (sp.owner_id === userId) return;
  if (!sp.owner_id) {
    const { error } = await db().from("teacher_spaces").update({ owner_id: userId }).eq("id", spaceId).is("owner_id", null);
    if (error) throw new Error(error.message);
    await db().from("space_staff").delete().eq("space_id", spaceId).eq("profile_id", userId);
    return;
  }
  const { error } = await db().from("space_staff").upsert(
    { space_id: spaceId, profile_id: userId, staff_role: "teacher", can_grade: true, can_manage_students: canManage },
    { onConflict: "space_id,profile_id" },
  );
  if (error) throw new Error(error.message);
}

export async function revokeTeacherSpace(userId: string, spaceId: string) {
  await db().from("teacher_spaces").update({ owner_id: null }).eq("id", spaceId).eq("owner_id", userId);
  await db().from("space_staff").delete().eq("space_id", spaceId).eq("profile_id", userId);
  await db().from("class_staff").delete().eq("space_id", spaceId).eq("profile_id", userId);
}

export async function setTeacherManage(userId: string, spaceId: string, canManage: boolean) {
  const { error } = await db().from("space_staff").update({ can_manage_students: canManage })
    .eq("space_id", spaceId).eq("profile_id", userId).eq("staff_role", "teacher");
  if (error) throw new Error(error.message);
}

/* ── 강사: 강좌 · 조교 · 수강생 ───────────────────── */

export type ClassDetail = {
  id: string; title: string; description: string | null; erp: boolean;
  subject: string | null; subjectDetail: string | null; kind: "regular" | "special";
  startsOn: string | null; endsOn: string | null; totalSessions: number | null; pricePerSession: number | null;
  capacity: number | null; isClosed: boolean; slots: Slot[];
  members: string[];
  roster: { id: string; name: string; school: string | null; grade: string | null }[];
  assistants: { id: string; name: string; email: string; assigned: boolean }[];
};

export async function getClassDetail(spaceId: string, classId: string): Promise<ClassDetail | null> {
  const { data: cls } = await db().from("classes")
    .select("id, title, description, erp_class_id, subject, subject_detail, kind, starts_on, ends_on, total_sessions, price_per_session, capacity, is_closed, slots")
    .eq("id", classId).eq("space_id", spaceId).maybeSingle();
  if (!cls) return null;
  type S = { id: string; name: string; school: string | null; grade: string | null };
  const [mem, enr, staffRes, csRes] = await Promise.all([
    selectAll<{ student_id: string }>("class_members", "student_id", (q) => q.eq("class_id", classId)),
    selectAll<{ students: S | S[] }>("enrollments", "students!inner(id, name, school, grade)", (q) => q.eq("space_id", spaceId).eq("status", "active")),
    db().from("space_staff").select("profile_id, profiles(full_name, login_id)").eq("space_id", spaceId).eq("staff_role", "assistant"),
    db().from("class_staff").select("profile_id").eq("class_id", classId),
  ]);
  type P = { full_name: string | null; login_id: string | null };
  const members = mem.map((m) => m.student_id);
  const memberSet = new Set(members);
  // 이 강좌 수강생을 맨 앞에 — 큰 공간은 재원생이 수백 명이라 체크된 학생을 찾기 어렵다
  const roster = enr
    .flatMap((r) => (Array.isArray(r.students) ? r.students : [r.students]))
    .sort((a, b) => Number(memberSet.has(b.id)) - Number(memberSet.has(a.id)) || a.name.localeCompare(b.name, "ko"));
  const assigned = new Set((csRes.data ?? []).map((r) => r.profile_id));
  const assistants = ((staffRes.data ?? []) as { profile_id: string; profiles: P | P[] | null }[]).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return { id: r.profile_id, name: p?.full_name ?? "", email: p?.login_id ?? "", assigned: assigned.has(r.profile_id) };
  }).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return {
    id: cls.id, title: cls.title, description: cls.description, erp: !!cls.erp_class_id,
    subject: cls.subject, subjectDetail: cls.subject_detail, kind: cls.kind, startsOn: cls.starts_on, endsOn: cls.ends_on,
    totalSessions: cls.total_sessions, pricePerSession: cls.price_per_session, capacity: cls.capacity, isClosed: cls.is_closed,
    slots: (cls.slots ?? []) as Slot[], members, roster, assistants,
  };
}

/** 조교를 공간 운영진으로 들이고(채점 O · 학생 관리 X) 강좌에 배정한다 */
export async function addAssistantToClass(spaceId: string, classId: string, userId: string) {
  const { data: cur } = await db().from("space_staff").select("staff_role").eq("space_id", spaceId).eq("profile_id", userId).maybeSingle();
  const { data: sp } = await db().from("teacher_spaces").select("owner_id").eq("id", spaceId).maybeSingle();
  if (sp?.owner_id === userId || cur?.staff_role === "teacher") throw new Error("이 공간의 강사예요. 조교로 배정할 필요가 없어요");
  if (!cur) {
    const { error } = await db().from("space_staff").insert({
      space_id: spaceId, profile_id: userId, staff_role: "assistant", can_grade: true, can_manage_students: false,
    });
    if (error) throw new Error(error.message);
  }
  const { error } = await db().from("class_staff").upsert({ class_id: classId, space_id: spaceId, profile_id: userId }, { onConflict: "class_id,profile_id" });
  if (error) throw new Error(error.message);
}
