"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureStaffAccount, grantTeacherSpace, revokeTeacherSpace, setTeacherManage, resetStaffPassword,
} from "@/lib/staff";
import { parseClassForm } from "@/lib/class-form";

/**
 * 학원 관리자(HQ) 전용 — 강사 등록 · LMS 계정 · 강좌 개설.
 * 모든 액션이 처음에 admin 인지 다시 확인한다. 화면에서 버튼을 숨기는 것만으로는 막히지 않는다.
 */

export type StaffActionState = {
  ok: boolean;
  message: string;
  credential?: { name: string; email: string; password: string };
  /** 성공 후 이어서 갈 화면 */
  href?: string;
  at?: number;
};

const fail = (message: string): StaffActionState => ({ ok: false, message, at: Date.now() });
const okState = (message: string, extra: Partial<StaffActionState> = {}): StaffActionState => ({ ok: true, message, at: Date.now(), ...extra });

async function isHq() {
  const v = await getViewer();
  return !!v && !v.mustChangePassword && v.isAdmin;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const db = () => createAdminClient();

const SUBJECT_COLOR: Record<string, string> = {
  수학: "#3182f6", 국어: "#e8590c", 영어: "#7048e8", 과탐: "#0ca678", 사탐: "#d6336c",
  한국사: "#c2255c", 제2외국어: "#1098ad", 컨설팅: "#495057", 기타: "#868e96",
};

function teacherFields(form: FormData) {
  const name = str(form, "name");
  if (!name) throw new Error("성명을 적어 주세요");
  const subjects = form.getAll("subjects").map(String).filter(Boolean);
  const phone = str(form, "phone").replace(/[^\d-]/g, "");
  const email = str(form, "email").toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("이메일 형식이 아니에요");
  return {
    name,
    subjects,
    subject: subjects[0] ?? null,
    phone: phone || null,
    email: email || null,
    hired_on: str(form, "hiredOn") || null,
    corporation: str(form, "corporation") || null,
    employment: str(form, "employment") === "퇴사" ? "퇴사" : "재직",
  };
}

/** 강사 등록 — ERP 강사 등록과 같은 항목. 이메일을 적으면 LMS 로그인 계정도 같이 만든다 */
export async function createTeacher(_prev: StaffActionState, form: FormData): Promise<StaffActionState> {
  if (!(await isHq())) return fail("학원 관리자만 할 수 있어요");
  let spaceId: string;
  let credential: StaffActionState["credential"];
  try {
    const f = teacherFields(form);
    const branchId = str(form, "branchId");
    if (!branchId) return fail("지점을 골라 주세요");
    const { data: last } = await db().from("teacher_spaces").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const slug = `t-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const { data, error } = await db().from("teacher_spaces").insert({
      ...f, branch_id: branchId, slug, is_active: f.employment === "재직",
      accent_color: SUBJECT_COLOR[f.subject ?? ""] ?? SUBJECT_COLOR.기타,
      sort_order: (last?.sort_order ?? 0) + 1,
    }).select("id").single();
    if (error) return fail(error.message);
    spaceId = data.id;
    if (f.email) {
      const acc = await ensureStaffAccount(f.email, f.name, "teacher");
      await grantTeacherSpace(acc.userId, spaceId, true);
      if (acc.password) credential = { name: acc.name, email: acc.email, password: acc.password };
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : "등록하지 못했어요");
  }
  revalidatePath("/hq");
  // 임시 비밀번호는 이 화면에서 한 번만 보여준다 — 주소나 쿠키에 싣지 않는다
  if (credential) return okState("강사를 등록하고 LMS 계정을 만들었어요", { credential, href: `/hq/teachers/${spaceId}` });
  redirect(`/hq/teachers/${spaceId}`);
}

export async function updateTeacher(spaceId: string, _prev: StaffActionState, form: FormData): Promise<StaffActionState> {
  if (!(await isHq())) return fail("학원 관리자만 할 수 있어요");
  try {
    const f = teacherFields(form);
    const { error } = await db().from("teacher_spaces").update({ ...f, is_active: f.employment === "재직" }).eq("id", spaceId);
    if (error) return fail(error.message);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "저장하지 못했어요");
  }
  revalidatePath("/hq");
  revalidatePath(`/hq/teachers/${spaceId}`);
  return okState("저장했어요");
}

/** 이 강사 공간의 주 강사 LMS 계정 발급 */
export async function issueTeacherAccount(spaceId: string, _prev: StaffActionState, form: FormData): Promise<StaffActionState> {
  if (!(await isHq())) return fail("학원 관리자만 할 수 있어요");
  try {
    const { data: sp } = await db().from("teacher_spaces").select("name, owner_id").eq("id", spaceId).maybeSingle();
    if (!sp) return fail("없는 강사예요");
    if (sp.owner_id) return fail("이미 LMS 계정이 있어요");
    const acc = await ensureStaffAccount(str(form, "email"), str(form, "name") || sp.name, "teacher");
    await grantTeacherSpace(acc.userId, spaceId, true);
    await db().from("teacher_spaces").update({ email: acc.email }).eq("id", spaceId).is("email", null);
    revalidatePath("/hq");
    revalidatePath(`/hq/teachers/${spaceId}`);
    return okState(acc.created ? `${acc.name} LMS 계정을 만들었어요` : `기존 계정(${acc.email})을 연결했어요`, {
      credential: acc.password ? { name: acc.name, email: acc.email, password: acc.password } : undefined,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "계정을 만들지 못했어요");
  }
}

/** 공동 강사 추가 — 이미 LMS 계정이 있는 강사(또는 새 이메일)를 이 공간에 붙인다 */
export async function addCoTeacher(spaceId: string, _prev: StaffActionState, form: FormData): Promise<StaffActionState> {
  if (!(await isHq())) return fail("학원 관리자만 할 수 있어요");
  try {
    const acc = await ensureStaffAccount(str(form, "email"), str(form, "name") || str(form, "email").split("@")[0], "teacher");
    await grantTeacherSpace(acc.userId, spaceId, false);
    revalidatePath(`/hq/teachers/${spaceId}`);
    return okState(`${acc.name}님을 공동 강사로 추가했어요`, {
      credential: acc.password ? { name: acc.name, email: acc.email, password: acc.password } : undefined,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "추가하지 못했어요");
  }
}

export async function revokeSpace(userId: string, spaceId: string): Promise<void> {
  if (!(await isHq())) return;
  await revokeTeacherSpace(userId, spaceId);
  revalidatePath("/hq");
  revalidatePath(`/hq/teachers/${spaceId}`);
}

export async function toggleManage(userId: string, spaceId: string, canManage: boolean): Promise<void> {
  if (!(await isHq())) return;
  await setTeacherManage(userId, spaceId, canManage);
  revalidatePath(`/hq/teachers/${spaceId}`);
}

export async function resetTeacherPassword(userId: string, name: string, email: string, _prev: StaffActionState): Promise<StaffActionState> {
  void _prev;
  if (!(await isHq())) return fail("학원 관리자만 할 수 있어요");
  try {
    const password = await resetStaffPassword(userId);
    return okState("임시 비밀번호를 새로 만들었어요", { credential: { name, email, password } });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "초기화하지 못했어요");
  }
}

/** HQ 강좌 개설 — 담당 강사를 고른다 */
export async function hqCreateClass(_prev: StaffActionState, form: FormData): Promise<StaffActionState> {
  if (!(await isHq())) return fail("학원 관리자만 할 수 있어요");
  const spaceId = str(form, "spaceId");
  const { data: sp } = await db().from("teacher_spaces").select("id, slug, branch_id").eq("id", spaceId).maybeSingle();
  if (!sp) return fail("담당 강사를 골라 주세요");
  let classId: string;
  try {
    const row = parseClassForm(form);
    const { data, error } = await db().from("classes").insert({ ...row, space_id: sp.id, branch_id: sp.branch_id }).select("id").single();
    if (error) return fail(error.message);
    classId = data.id;
  } catch (e) {
    return fail(e instanceof Error ? e.message : "개설하지 못했어요");
  }
  revalidatePath("/hq/classes");
  redirect(`/s/${sp.slug}/c/${classId}/settings`);
}

/* ── 계정 관리 ─────────────────────────────────── */

const ID_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

/** 로그인 아이디 바꾸기 — 학원 발급 아이디(s001 등) 또는 이메일 */
export async function changeLoginId(profileId: string, _prev: StaffActionState, form: FormData): Promise<StaffActionState> {
  if (!(await isHq())) return fail("학원 관리자만 할 수 있어요");
  const raw = str(form, "loginId").toLowerCase();
  const isEmail = raw.includes("@");
  if (isEmail ? !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw) : !ID_RE.test(raw)) {
    return fail("아이디는 영문 소문자·숫자 3~30자(또는 이메일)로 적어 주세요");
  }
  const { data: taken } = await db().from("profiles").select("id").eq("login_id", raw).neq("id", profileId).maybeSingle();
  if (taken) return fail("이미 쓰이는 아이디예요");
  const { error } = await db().auth.admin.updateUserById(profileId, {
    email: isEmail ? raw : `${raw}@id.sejung-lms.local`, email_confirm: true,
  });
  if (error) return fail(`바꾸지 못했어요: ${error.message}`);
  await db().from("profiles").update({ login_id: raw }).eq("id", profileId);
  revalidatePath("/hq/accounts");
  return okState(`아이디를 ${raw}(으)로 바꿨어요`);
}

/** 학생·학부모 계정 발급 (아직 없는 사람) */
export async function issueFamilyAccount(kind: "student" | "parent", entityId: string, _prev: StaffActionState): Promise<StaffActionState> {
  void _prev;
  if (!(await isHq())) return fail("학원 관리자만 할 수 있어요");
  const { issueAccount } = await import("@/lib/accounts");
  const { data: row } = await db().from(kind === "student" ? "students" : "parents").select("id, name, phone, profile_id").eq("id", entityId).maybeSingle();
  if (!row) return fail("없는 사람이에요");
  if (row.profile_id) return fail("이미 계정이 있어요");
  try {
    const cred = await issueAccount({ kind, id: row.id, name: row.name, of: null, phone: row.phone, profileId: null, loginId: null });
    revalidatePath("/hq/accounts");
    return okState(`${row.name} 계정을 만들었어요`, { credential: { name: cred.name, email: cred.loginId, password: cred.password } });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "발급하지 못했어요");
  }
}
