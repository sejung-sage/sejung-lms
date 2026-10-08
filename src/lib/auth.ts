import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SpaceDetail } from "@/lib/spaces";

/**
 * 인증 · 인가의 단일 진입점 (Next 문서의 DAL 패턴).
 *
 * 데이터 조회는 아직 서비스 키(RLS 우회)로 한다. 그래서 "이 사람이 이걸 봐도 되는가"는
 * 전부 여기 함수들이 판단한다 — 페이지·서버 액션은 데이터를 만지기 전에 반드시 여길 거친다.
 * proxy.ts 의 로그인 리다이렉트는 편의일 뿐, 보안 경계는 여기다.
 */

/** 학원이 발급한 아이디를 Supabase 이메일로 바꾸는 규칙. 운영진은 진짜 이메일을 그대로 쓴다 */
export const ID_DOMAIN = "id.sejung-lms.local";

export function normalizeLoginId(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

export function loginEmail(raw: string) {
  const v = raw.trim().toLowerCase();
  return v.includes("@") ? v : `${normalizeLoginId(v)}@${ID_DOMAIN}`;
}

/** 로그인 후 돌아갈 곳 — 우리 사이트 안의 경로만 (//evil.com, /\\evil.com 같은 우회 차단) */
export function safeNextPath(raw: unknown) {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/";
}

export type StaffGrant = {
  owner: boolean; canGrade: boolean; canManage: boolean;
  /** 조교는 배정받은 강좌(class_staff)만 본다. 강사·관리자는 공간의 모든 강좌 */
  assistant: boolean;
};

export type Viewer = {
  userId: string;
  role: "admin" | "teacher" | "assistant" | "student" | "parent";
  name: string;
  loginId: string | null;
  mustChangePassword: boolean;
  isAdmin: boolean;
  /** 운영진으로 들어갈 수 있는 공간 → 권한 */
  staff: Map<string, StaffGrant>;
  /** 학생 본인이면 students.id */
  studentId: string | null;
  /** 학부모면 자녀 students.id 들 */
  childIds: string[];
};

/** 요청 하나 안에서는 한 번만 조회한다 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const db = createAdminClient();
  const [profileRes, ownedRes, staffRes, studentRes, parentRes] = await Promise.all([
    db.from("profiles").select("role, full_name, login_id").eq("id", user.id).maybeSingle(),
    db.from("teacher_spaces").select("id").eq("owner_id", user.id),
    db.from("space_staff").select("space_id, staff_role, can_grade, can_manage_students").eq("profile_id", user.id),
    db.from("students").select("id").eq("profile_id", user.id).maybeSingle(),
    db.from("parents").select("id, parent_links(student_id)").eq("profile_id", user.id).maybeSingle(),
  ]);
  const profile = profileRes.data;
  if (!profile) return null;

  const staff = new Map<string, StaffGrant>();
  for (const s of staffRes.data ?? []) {
    staff.set(s.space_id, { owner: false, canGrade: s.can_grade, canManage: s.can_manage_students, assistant: s.staff_role === "assistant" });
  }
  for (const s of ownedRes.data ?? []) staff.set(s.id, { owner: true, canGrade: true, canManage: true, assistant: false });

  const parent = parentRes.data as { id: string; parent_links: { student_id: string }[] } | null;

  return {
    userId: user.id,
    role: profile.role,
    name: profile.full_name ?? "",
    loginId: profile.login_id,
    mustChangePassword: user.user_metadata?.must_change_password === true,
    isAdmin: profile.role === "admin",
    staff,
    studentId: studentRes.data?.id ?? null,
    childIds: (parent?.parent_links ?? []).map((l) => l.student_id),
  };
});

export function staffGrant(v: Viewer, spaceId: string): StaffGrant | null {
  if (v.isAdmin) return { owner: true, canGrade: true, canManage: true, assistant: false };
  return v.staff.get(spaceId) ?? null;
}

export const isStaffOf = (v: Viewer, spaceId: string) => staffGrant(v, spaceId) != null;

/* ── 페이지용 가드 — 통과 못 하면 리다이렉트 ─────────────── */

export async function requireLogin(next?: string): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (v.mustChangePassword) redirect("/account?first=1");
  return v;
}

/** 이 학생(들) 중 이 공간에 다니는 학생 */
async function enrolledIn(spaceId: string, studentIds: string[]) {
  if (!studentIds.length) return [];
  const { data } = await createAdminClient()
    .from("enrollments")
    .select("students!inner(id, name)")
    .eq("space_id", spaceId)
    .eq("status", "active")
    .in("student_id", studentIds);
  type S = { id: string; name: string };
  return (data ?? [])
    .flatMap((r: { students: S | S[] }) => (Array.isArray(r.students) ? r.students : [r.students]))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/** 운영진 화면. 학생·학부모가 들어오면 자기 앱으로 돌려보낸다 */
export async function requireStaff(space: SpaceDetail, slug: string): Promise<Viewer> {
  const v = await requireLogin(`/s/${slug}`);
  if (isStaffOf(v, space.id)) return v;
  if (v.studentId && (await enrolledIn(space.id, [v.studentId])).length) redirect(`/s/${slug}/student`);
  if ((await enrolledIn(space.id, v.childIds)).length) redirect(`/s/${slug}/parent`);
  redirect("/");
}

export type StudentContext = { viewer: Viewer; student: { id: string; name: string }; preview: boolean };

/**
 * 학생 화면의 '누구'.
 *  - 학생 본인: 이 공간에 다녀야 한다
 *  - 운영진: 미리보기로 첫 학생 화면을 보여준다 (제출 같은 쓰기는 막힌다)
 */
export async function studentContext(space: SpaceDetail, slug: string): Promise<StudentContext> {
  const v = await requireLogin(`/s/${slug}/student`);
  if (v.studentId) {
    const [me] = await enrolledIn(space.id, [v.studentId]);
    if (me) return { viewer: v, student: me, preview: false };
  }
  if (isStaffOf(v, space.id)) {
    const first = await firstStudent(space.id);
    if (first) return { viewer: v, student: first, preview: true };
  }
  redirect("/");
}

export type ParentContext = {
  viewer: Viewer;
  child: { id: string; name: string };
  /** 이 공간에 다니는 자녀 전부 (형제가 같은 쌤 수업을 들을 수 있다) */
  children: { id: string; name: string }[];
  preview: boolean;
};

export async function parentContext(space: SpaceDetail, slug: string): Promise<ParentContext> {
  const v = await requireLogin(`/s/${slug}/parent`);
  const kids = await enrolledIn(space.id, v.childIds);
  if (kids.length) return { viewer: v, child: kids[0], children: kids, preview: false };
  if (isStaffOf(v, space.id)) {
    const first = await firstStudent(space.id);
    if (first) return { viewer: v, child: first, children: [first], preview: true };
  }
  redirect("/");
}

async function firstStudent(spaceId: string) {
  const { data } = await createAdminClient()
    .from("enrollments")
    .select("students!inner(id, name)")
    .eq("space_id", spaceId)
    .eq("status", "active");
  type S = { id: string; name: string };
  const rows = (data ?? []).flatMap((r: { students: S | S[] }) => (Array.isArray(r.students) ? r.students : [r.students]));
  rows.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return rows[0] ?? null;
}

/* ── 서버 액션용 — 리다이렉트 대신 null ─────────────────── */

export async function staffForAction(spaceId: string): Promise<{ viewer: Viewer; grant: StaffGrant } | null> {
  const v = await getViewer();
  if (!v || v.mustChangePassword) return null;
  const grant = staffGrant(v, spaceId);
  return grant ? { viewer: v, grant } : null;
}

/** 학생 본인만 (운영진 미리보기는 제외) */
export async function studentForAction(spaceId: string): Promise<{ id: string; name: string } | null> {
  const v = await getViewer();
  if (!v || v.mustChangePassword || !v.studentId) return null;
  const [me] = await enrolledIn(spaceId, [v.studentId]);
  return me ?? null;
}

/** 런처에 보일 공간 id — 운영진은 담당 공간(관리자는 전부), 학생·학부모는 다니는 공간 */
export async function launcherSpaceIds(v: Viewer): Promise<{ ids: Set<string> | "all"; target: Map<string, "admin" | "student" | "parent"> }> {
  const target = new Map<string, "admin" | "student" | "parent">();
  const ids = new Set<string>();
  const db = createAdminClient();
  const enr = async (studentIds: string[], kind: "student" | "parent") => {
    if (!studentIds.length) return;
    const { data } = await db.from("enrollments").select("space_id").eq("status", "active").in("student_id", studentIds);
    for (const r of data ?? []) { ids.add(r.space_id); if (!target.has(r.space_id)) target.set(r.space_id, kind); }
  };
  await enr(v.studentId ? [v.studentId] : [], "student");
  await enr(v.childIds, "parent");
  for (const id of v.staff.keys()) { ids.add(id); target.set(id, "admin"); }
  return { ids: v.isAdmin ? "all" : ids, target };
}

/* ── 강좌 단위 ──────────────────────────────────── */

/** 이 사람이 이 공간에서 볼 수 있는 강좌 — 강사·관리자는 전부("all"), 조교는 배정받은 강좌만 */
export async function visibleClassIds(v: Viewer, spaceId: string): Promise<"all" | string[]> {
  const g = staffGrant(v, spaceId);
  if (!g) return [];
  if (!g.assistant) return "all";
  const { data } = await createAdminClient().from("class_staff").select("class_id").eq("space_id", spaceId).eq("profile_id", v.userId);
  return (data ?? []).map((r) => r.class_id);
}

export type CourseRef = { id: string; title: string; subject: string | null };

/** 강좌 화면 가드 — 이 공간의 강좌이고, 조교라면 배정받은 강좌여야 한다 */
export async function requireCourse(space: SpaceDetail, slug: string, classId: string): Promise<{ viewer: Viewer; grant: StaffGrant; course: CourseRef }> {
  const viewer = await requireStaff(space, slug);
  const { data } = await createAdminClient().from("classes").select("id, title, subject").eq("id", classId).eq("space_id", space.id).maybeSingle();
  if (!data) redirect(`/s/${slug}`);
  const ids = await visibleClassIds(viewer, space.id);
  if (ids !== "all" && !ids.includes(classId)) redirect(`/s/${slug}`);
  return { viewer, grant: staffGrant(viewer, space.id)!, course: data };
}

/** 서버 액션용 — 강좌 접근 가능 여부 */
export async function canSeeClass(v: Viewer, spaceId: string, classId: string | null): Promise<boolean> {
  if (!classId) return !!staffGrant(v, spaceId) && !staffGrant(v, spaceId)!.assistant;
  const ids = await visibleClassIds(v, spaceId);
  return ids === "all" || ids.includes(classId);
}

/** 학생이 이 공간에서 듣는 강좌 id */
export async function studentClassIds(studentId: string, spaceId: string): Promise<string[]> {
  const { data } = await createAdminClient().from("class_members").select("class_id").eq("student_id", studentId).eq("space_id", spaceId);
  return (data ?? []).map((r) => r.class_id);
}

/** 시험 화면 가드 — 강좌 시험이면 그 강좌 접근 권한, 강좌 없는 옛 시험은 강사만 */
export async function requireExamScope(space: SpaceDetail, slug: string, classId: string | null): Promise<{ grant: StaffGrant; course: CourseRef | null }> {
  if (classId) {
    const { grant, course } = await requireCourse(space, slug, classId);
    return { grant, course };
  }
  const v = await requireStaff(space, slug);
  const grant = staffGrant(v, space.id)!;
  if (grant.assistant) redirect(`/s/${slug}`);
  return { grant, course: null };
}
