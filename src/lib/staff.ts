import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { tempPassword } from "@/lib/accounts";

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

export type TeacherRow = {
  userId: string;
  name: string;
  email: string;
  lastSignIn: string | null;
  spaces: { id: string; name: string; subject: string | null; slug: string | null; owner: boolean; canManage: boolean }[];
};

export type SpaceRow = {
  id: string; name: string; subject: string | null; slug: string | null; accent: string;
  ownerName: string | null; classCount: number; studentCount: number; assistantCount: number;
};

export async function getHqOverview(): Promise<{ teachers: TeacherRow[]; spaces: SpaceRow[] }> {
  const [spRes, profRes, staffRes, clsRes, enrRes] = await Promise.all([
    db().from("teacher_spaces").select("id, name, subject, slug, accent_color, owner_id").eq("is_active", true).order("sort_order"),
    db().from("profiles").select("id, full_name, login_id, role").in("role", ["teacher", "admin"]),
    db().from("space_staff").select("space_id, profile_id, staff_role, can_manage_students"),
    db().from("classes").select("space_id"),
    db().from("enrollments").select("space_id").eq("status", "active"),
  ]);
  const spaces = spRes.data ?? [];
  const profs = (profRes.data ?? []).filter((p) => p.role === "teacher");
  const staff = staffRes.data ?? [];
  const count = (rows: { space_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.space_id === id).length;

  const signIns = new Map<string, string | null>();
  for (let page = 1; ; page++) {
    const { data } = await db().auth.admin.listUsers({ page, perPage: 200 });
    for (const u of data?.users ?? []) signIns.set(u.id, u.last_sign_in_at ?? null);
    if ((data?.users.length ?? 0) < 200) break;
  }

  const nameOf = new Map((profRes.data ?? []).map((p) => [p.id, p.full_name as string | null]));
  const teachers: TeacherRow[] = profs
    .map((p) => ({
      userId: p.id,
      name: p.full_name ?? "",
      email: p.login_id ?? "",
      lastSignIn: signIns.get(p.id) ?? null,
      spaces: spaces
        .filter((s) => s.owner_id === p.id || staff.some((x) => x.space_id === s.id && x.profile_id === p.id && x.staff_role === "teacher"))
        .map((s) => ({
          id: s.id, name: s.name, subject: s.subject, slug: s.slug,
          owner: s.owner_id === p.id,
          canManage: s.owner_id === p.id || !!staff.find((x) => x.space_id === s.id && x.profile_id === p.id)?.can_manage_students,
        })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return {
    teachers,
    spaces: spaces.map((s) => ({
      id: s.id, name: s.name, subject: s.subject, slug: s.slug, accent: s.accent_color,
      ownerName: s.owner_id ? (nameOf.get(s.owner_id) ?? null) : null,
      classCount: count(clsRes.data, s.id),
      studentCount: count(enrRes.data, s.id),
      assistantCount: staff.filter((x) => x.space_id === s.id && x.staff_role === "assistant").length,
    })),
  };
}

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

export async function createSpace(input: { name: string; subject: string; slug: string; accent: string }) {
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) throw new Error("주소는 영문 소문자·숫자·하이픈으로 적어 주세요 (예: lee-math)");
  if (!input.name.trim()) throw new Error("공간 이름을 적어 주세요");
  const { data: br } = await db().from("branches").select("id").limit(1).maybeSingle();
  if (!br) throw new Error("지점 정보가 없어요");
  const { data: last } = await db().from("teacher_spaces").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db().from("teacher_spaces").insert({
    branch_id: br.id, name: input.name.trim(), subject: input.subject.trim() || null, slug,
    accent_color: /^#[0-9a-f]{6}$/i.test(input.accent) ? input.accent : "#3182f6",
    sort_order: (last?.sort_order ?? 0) + 1,
  }).select("id").single();
  if (error) throw new Error(error.code === "23505" ? "이미 쓰이는 주소예요" : error.message);
  return data.id as string;
}

/* ── 강사: 강좌 · 조교 · 수강생 ───────────────────── */

export type ClassSummary = {
  id: string; title: string; description: string | null;
  students: number; sessions: number; assistants: { id: string; name: string }[];
};

export async function getSpaceClasses(spaceId: string): Promise<ClassSummary[]> {
  const [clsRes, memRes, sesRes, csRes] = await Promise.all([
    db().from("classes").select("id, title, description, created_at").eq("space_id", spaceId).order("created_at"),
    db().from("class_members").select("class_id").eq("space_id", spaceId),
    db().from("sessions").select("class_id").eq("space_id", spaceId),
    db().from("class_staff").select("class_id, profile_id, profiles(full_name)").eq("space_id", spaceId),
  ]);
  type CS = { class_id: string; profile_id: string; profiles: { full_name: string | null } | { full_name: string | null }[] | null };
  const name = (p: CS["profiles"]) => (Array.isArray(p) ? p[0]?.full_name : p?.full_name) ?? "";
  return (clsRes.data ?? []).map((c) => ({
    id: c.id, title: c.title, description: c.description,
    students: (memRes.data ?? []).filter((m) => m.class_id === c.id).length,
    sessions: (sesRes.data ?? []).filter((s) => s.class_id === c.id).length,
    assistants: ((csRes.data ?? []) as CS[]).filter((s) => s.class_id === c.id).map((s) => ({ id: s.profile_id, name: name(s.profiles) })),
  }));
}

export type ClassDetail = {
  id: string; title: string; description: string | null;
  members: string[];
  roster: { id: string; name: string; school: string | null; grade: string | null }[];
  assistants: { id: string; name: string; email: string; assigned: boolean }[];
};

export async function getClassDetail(spaceId: string, classId: string): Promise<ClassDetail | null> {
  const { data: cls } = await db().from("classes").select("id, title, description").eq("id", classId).eq("space_id", spaceId).maybeSingle();
  if (!cls) return null;
  const [memRes, enrRes, staffRes, csRes] = await Promise.all([
    db().from("class_members").select("student_id").eq("class_id", classId),
    db().from("enrollments").select("students!inner(id, name, school, grade)").eq("space_id", spaceId).eq("status", "active"),
    db().from("space_staff").select("profile_id, profiles(full_name, login_id)").eq("space_id", spaceId).eq("staff_role", "assistant"),
    db().from("class_staff").select("profile_id").eq("class_id", classId),
  ]);
  type S = { id: string; name: string; school: string | null; grade: string | null };
  type P = { full_name: string | null; login_id: string | null };
  const roster = (enrRes.data ?? [])
    .flatMap((r: { students: S | S[] }) => (Array.isArray(r.students) ? r.students : [r.students]))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const assigned = new Set((csRes.data ?? []).map((r) => r.profile_id));
  const assistants = ((staffRes.data ?? []) as { profile_id: string; profiles: P | P[] | null }[]).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return { id: r.profile_id, name: p?.full_name ?? "", email: p?.login_id ?? "", assigned: assigned.has(r.profile_id) };
  }).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return { ...cls, members: (memRes.data ?? []).map((m) => m.student_id), roster, assistants };
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
