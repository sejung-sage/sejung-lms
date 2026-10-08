import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { selectAll } from "@/lib/db-all";

/**
 * 학원 관리(HQ) 화면 데이터 — ERP 강사·강좌 화면과 같은 단위로 보여준다.
 * 공간(teacher_spaces) = 강사, classes = 강좌.
 */

const db = () => createAdminClient();

export const SUBJECTS = ["국어", "수학", "영어", "과탐", "사탐", "한국사", "제2외국어", "컨설팅", "기타"] as const;
export const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export type Slot = { weekday: string; start_time: string; end_time: string; room_name: string | null };

export type Branch = { id: string; name: string; erpId: string | null };

export async function getBranches(): Promise<Branch[]> {
  const { data } = await db().from("branches").select("id, name, erp_id").order("created_at");
  const order = ["daechi", "banpo", "bangbae", "songdo", "dongtan"];
  const rank = (b: Branch) => { const i = order.indexOf(b.erpId ?? ""); return i < 0 ? 99 : i; };
  return (data ?? [])
    .map((b) => ({ id: b.id, name: b.name, erpId: b.erp_id }))
    .sort((a, b) => rank(a) - rank(b));
}

/* ── 강사 목록 ──────────────────────────────────── */

export type HqTeacher = {
  id: string; slug: string | null; name: string; branchId: string;
  phone: string | null; subjects: string[]; corporation: string | null; hiredOn: string | null;
  employment: "재직" | "퇴사"; erp: boolean; accent: string;
  openClasses: string[]; openClassCount: number; studentCount: number;
  owner: { id: string; name: string; email: string } | null;
  coTeachers: number; assistants: number;
};

export async function getHqTeachers(): Promise<HqTeacher[]> {
  type S = {
    id: string; slug: string | null; name: string; branch_id: string; phone: string | null; subjects: string[] | null;
    subject: string | null; corporation: string | null; hired_on: string | null; employment: "재직" | "퇴사";
    erp_teacher_id: string | null; accent_color: string; owner_id: string | null;
  };
  const [spaces, classes, enr, staff] = await Promise.all([
    selectAll<S>("teacher_spaces", "id, slug, name, branch_id, phone, subjects, subject, corporation, hired_on, employment, erp_teacher_id, accent_color, owner_id"),
    selectAll<{ space_id: string; title: string; starts_on: string | null }>("classes", "space_id, title, starts_on", (q) => q.eq("is_closed", false).order("starts_on", { ascending: false })),
    selectAll<{ space_id: string }>("enrollments", "space_id", (q) => q.eq("status", "active")),
    selectAll<{ space_id: string; staff_role: string }>("space_staff", "space_id, staff_role"),
  ]);
  const ownerIds = [...new Set(spaces.map((s) => s.owner_id).filter((x): x is string => !!x))];
  const { data: owners } = ownerIds.length
    ? await db().from("profiles").select("id, full_name, login_id").in("id", ownerIds)
    : { data: [] as { id: string; full_name: string | null; login_id: string | null }[] };
  const ownerOf = new Map((owners ?? []).map((o) => [o.id, { id: o.id, name: o.full_name ?? "", email: o.login_id ?? "" }]));

  const clsBy = new Map<string, string[]>();
  for (const c of classes) clsBy.set(c.space_id, [...(clsBy.get(c.space_id) ?? []), c.title]);
  const stuBy = new Map<string, number>();
  for (const e of enr) stuBy.set(e.space_id, (stuBy.get(e.space_id) ?? 0) + 1);

  return spaces
    .map((s) => ({
      id: s.id, slug: s.slug, name: s.name, branchId: s.branch_id, phone: s.phone,
      subjects: s.subjects?.length ? s.subjects : s.subject ? [s.subject] : [],
      corporation: s.corporation, hiredOn: s.hired_on, employment: s.employment, erp: !!s.erp_teacher_id,
      accent: s.accent_color,
      openClasses: (clsBy.get(s.id) ?? []).slice(0, 3), openClassCount: clsBy.get(s.id)?.length ?? 0,
      studentCount: stuBy.get(s.id) ?? 0,
      owner: s.owner_id ? (ownerOf.get(s.owner_id) ?? null) : null,
      coTeachers: staff.filter((x) => x.space_id === s.id && x.staff_role === "teacher").length,
      assistants: staff.filter((x) => x.space_id === s.id && x.staff_role === "assistant").length,
    }))
    .sort((a, b) => (a.employment === b.employment ? a.name.localeCompare(b.name, "ko") : a.employment === "재직" ? -1 : 1));
}

export async function getCorporations(): Promise<string[]> {
  const rows = await selectAll<{ corporation: string | null }>("teacher_spaces", "corporation", (q) => q.not("corporation", "is", null));
  return [...new Set(rows.map((r) => r.corporation!).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
}

/* ── 강사 상세 ──────────────────────────────────── */

export type HqTeacherDetail = HqTeacher & {
  email: string | null; branchName: string;
  coTeacherList: { id: string; name: string; email: string; canManage: boolean }[];
};

export async function getHqTeacher(spaceId: string): Promise<HqTeacherDetail | null> {
  const { data: s } = await db().from("teacher_spaces")
    .select("id, slug, name, branch_id, phone, email, subjects, subject, corporation, hired_on, employment, erp_teacher_id, accent_color, owner_id, branches(name)")
    .eq("id", spaceId).maybeSingle();
  if (!s) return null;
  const [cls, enr, staffRes, owner] = await Promise.all([
    db().from("classes").select("title", { count: "exact" }).eq("space_id", spaceId).eq("is_closed", false).limit(3),
    db().from("enrollments").select("id", { count: "exact", head: true }).eq("space_id", spaceId).eq("status", "active"),
    db().from("space_staff").select("profile_id, staff_role, can_manage_students, profiles(full_name, login_id)").eq("space_id", spaceId),
    s.owner_id ? db().from("profiles").select("id, full_name, login_id").eq("id", s.owner_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  type P = { full_name: string | null; login_id: string | null };
  const staff = (staffRes.data ?? []) as { profile_id: string; staff_role: string; can_manage_students: boolean; profiles: P | P[] | null }[];
  const prof = (p: P | P[] | null) => (Array.isArray(p) ? p[0] : p);
  const br = s.branches as { name: string } | { name: string }[] | null;
  return {
    id: s.id, slug: s.slug, name: s.name, branchId: s.branch_id, phone: s.phone, email: s.email,
    subjects: s.subjects?.length ? s.subjects : s.subject ? [s.subject] : [],
    corporation: s.corporation, hiredOn: s.hired_on, employment: s.employment, erp: !!s.erp_teacher_id,
    accent: s.accent_color, branchName: (Array.isArray(br) ? br[0]?.name : br?.name) ?? "",
    openClasses: (cls.data ?? []).map((c) => c.title), openClassCount: cls.count ?? 0, studentCount: enr.count ?? 0,
    owner: owner.data ? { id: owner.data.id, name: owner.data.full_name ?? "", email: owner.data.login_id ?? "" } : null,
    coTeachers: staff.filter((x) => x.staff_role === "teacher").length,
    assistants: staff.filter((x) => x.staff_role === "assistant").length,
    coTeacherList: staff.filter((x) => x.staff_role === "teacher").map((x) => ({
      id: x.profile_id, name: prof(x.profiles)?.full_name ?? "", email: prof(x.profiles)?.login_id ?? "", canManage: x.can_manage_students,
    })),
  };
}

/* ── 강좌 목록 (ERP 강좌 화면과 같은 열) ─────────── */

export type ClassRow = {
  id: string; spaceId: string; spaceSlug: string | null; teacherName: string; branchId: string | null;
  title: string; subject: string | null; kind: "regular" | "special"; slots: Slot[];
  startsOn: string | null; endsOn: string | null; enrolled: number; capacity: number | null;
  pricePerSession: number | null; totalSessions: number | null; isClosed: boolean; erp: boolean; assistants: number;
};

export type ClassQuery = { branchId?: string; spaceId?: string; subject?: string; kind?: string; q?: string; closed?: boolean; page?: number };
export const CLASS_PAGE = 50;

export async function getClassRows(f: ClassQuery): Promise<{ rows: ClassRow[]; total: number }> {
  let q = db().from("classes")
    .select("id, space_id, branch_id, title, subject, kind, slots, starts_on, ends_on, capacity, price_per_session, total_sessions, is_closed, erp_class_id, teacher_spaces!inner(name, slug, branch_id)", { count: "exact" });
  if (f.spaceId) q = q.eq("space_id", f.spaceId);
  if (f.branchId) q = q.eq("teacher_spaces.branch_id", f.branchId);
  if (f.subject) q = q.eq("subject", f.subject);
  if (f.kind === "regular" || f.kind === "special") q = q.eq("kind", f.kind);
  if (!f.closed) q = q.eq("is_closed", false);
  if (f.q) q = q.or(`title.ilike.%${f.q.replace(/[%,()]/g, "")}%`);
  const page = Math.max(1, f.page ?? 1);
  const { data, count } = await q
    .order("starts_on", { ascending: false, nullsFirst: false })
    .order("title")
    .range((page - 1) * CLASS_PAGE, page * CLASS_PAGE - 1);

  type R = {
    id: string; space_id: string; branch_id: string | null; title: string; subject: string | null; kind: "regular" | "special";
    slots: Slot[] | null; starts_on: string | null; ends_on: string | null; capacity: number | null; price_per_session: number | null;
    total_sessions: number | null; is_closed: boolean; erp_class_id: string | null;
    teacher_spaces: { name: string; slug: string | null } | { name: string; slug: string | null }[];
  };
  const rows = (data ?? []) as R[];
  const ids = rows.map((r) => r.id);
  const [mem, cs] = ids.length
    ? await Promise.all([
        selectAll<{ class_id: string }>("class_members", "class_id", (x) => x.in("class_id", ids)),
        selectAll<{ class_id: string }>("class_staff", "class_id", (x) => x.in("class_id", ids)),
      ])
    : [[], []];
  const n = (list: { class_id: string }[], id: string) => list.filter((m) => m.class_id === id).length;
  return {
    total: count ?? 0,
    rows: rows.map((r) => {
      const t = Array.isArray(r.teacher_spaces) ? r.teacher_spaces[0] : r.teacher_spaces;
      return {
        id: r.id, spaceId: r.space_id, spaceSlug: t?.slug ?? null, teacherName: t?.name ?? "", branchId: r.branch_id,
        title: r.title, subject: r.subject, kind: r.kind, slots: r.slots ?? [], startsOn: r.starts_on, endsOn: r.ends_on,
        enrolled: n(mem, r.id), capacity: r.capacity, pricePerSession: r.price_per_session, totalSessions: r.total_sessions,
        isClosed: r.is_closed, erp: !!r.erp_class_id, assistants: n(cs, r.id),
      };
    }),
  };
}

/** 강좌 개설 폼의 강사 고르기 — 재직 강사만 */
export async function getTeacherOptions(): Promise<{ id: string; name: string; branch: string; subjects: string[] }[]> {
  const [spaces, branches] = await Promise.all([
    selectAll<{ id: string; name: string; branch_id: string; subjects: string[] | null; subject: string | null }>(
      "teacher_spaces", "id, name, branch_id, subjects, subject", (q) => q.eq("employment", "재직").eq("is_active", true)),
    getBranches(),
  ]);
  const bn = new Map(branches.map((b) => [b.id, b.name]));
  return spaces
    .map((s) => ({ id: s.id, name: s.name, branch: bn.get(s.branch_id) ?? "", subjects: s.subjects?.length ? s.subjects : s.subject ? [s.subject] : [] }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/* ── 계정 관리 — 강사 · 조교 · 학생 · 학부모 로그인 아이디 ── */

export type AccountKind = "teacher" | "assistant" | "student" | "parent";
export type HqAccount = {
  kind: AccountKind;
  /** 로그인 계정(profiles.id) — 학생·학부모는 아직 없을 수 있다 */
  profileId: string | null;
  /** students.id / parents.id (학생·학부모만) */
  entityId: string | null;
  name: string;
  loginId: string | null;
  /** 소속 — 강사: 공간 / 조교: 공간·담당 강좌 / 학생: 학교·수강 강좌 / 학부모: 자녀 */
  detail: string;
  phone: string | null;
  lastSignIn: string | null;
};

export async function getHqAccounts(): Promise<HqAccount[]> {
  type Prof = { id: string; role: string; full_name: string | null; login_id: string | null };
  const [profiles, spaces, staff, classStaff, classes, students, members, parents, links] = await Promise.all([
    selectAll<Prof>("profiles", "id, role, full_name, login_id", (q) => q.in("role", ["teacher", "assistant"])),
    selectAll<{ id: string; name: string; owner_id: string | null }>("teacher_spaces", "id, name, owner_id"),
    selectAll<{ space_id: string; profile_id: string; staff_role: string }>("space_staff", "space_id, profile_id, staff_role"),
    selectAll<{ class_id: string; profile_id: string }>("class_staff", "class_id, profile_id"),
    selectAll<{ id: string; title: string }>("classes", "id, title"),
    selectAll<{ id: string; name: string; school: string | null; grade: string | null; phone: string | null; profile_id: string | null }>(
      "students", "id, name, school, grade, phone, profile_id"),
    selectAll<{ class_id: string; student_id: string }>("class_members", "class_id, student_id"),
    selectAll<{ id: string; name: string; phone: string | null; profile_id: string | null }>("parents", "id, name, phone, profile_id"),
    selectAll<{ parent_id: string; student_id: string }>("parent_links", "parent_id, student_id"),
  ]);
  const loginOf = new Map<string, string | null>();
  const studentProfiles = [...students, ...parents].map((x) => x.profile_id).filter((x): x is string => !!x);
  for (let i = 0; i < studentProfiles.length; i += 200) {
    const { data } = await db().from("profiles").select("id, login_id").in("id", studentProfiles.slice(i, i + 200));
    for (const p of data ?? []) loginOf.set(p.id, p.login_id);
  }
  const signIn = new Map<string, string | null>();
  for (let page = 1; ; page++) {
    const { data } = await db().auth.admin.listUsers({ page, perPage: 1000 });
    for (const u of data?.users ?? []) signIn.set(u.id, u.last_sign_in_at ?? null);
    if ((data?.users.length ?? 0) < 1000) break;
  }
  const spaceName = new Map(spaces.map((s) => [s.id, s.name]));
  const classTitle = new Map(classes.map((c) => [c.id, c.title]));
  const studentName = new Map(students.map((s) => [s.id, s.name]));
  const byName = (a: HqAccount, b: HqAccount) => (a.loginId ?? "~").localeCompare(b.loginId ?? "~") || a.name.localeCompare(b.name, "ko");

  const staffRows: HqAccount[] = profiles.map((p) => {
    const mySpaces = [
      ...spaces.filter((s) => s.owner_id === p.id).map((s) => s.name),
      ...staff.filter((x) => x.profile_id === p.id).map((x) => spaceName.get(x.space_id) ?? ""),
    ].filter(Boolean);
    const myClasses = classStaff.filter((x) => x.profile_id === p.id).map((x) => classTitle.get(x.class_id)).filter(Boolean);
    return {
      kind: p.role as AccountKind, profileId: p.id, entityId: null, name: p.full_name ?? "", loginId: p.login_id, phone: null,
      detail: p.role === "assistant"
        ? `${mySpaces.join(", ") || "공간 없음"}${myClasses.length ? ` · 담당 ${myClasses.join(", ")}` : " · 담당 강좌 없음"}`
        : mySpaces.join(", ") || "담당 공간 없음",
      lastSignIn: signIn.get(p.id) ?? null,
    };
  });

  const studentRows: HqAccount[] = students.map((s) => {
    const cls = members.filter((m) => m.student_id === s.id).map((m) => classTitle.get(m.class_id)).filter(Boolean);
    return {
      kind: "student", profileId: s.profile_id, entityId: s.id, name: s.name, phone: s.phone,
      loginId: s.profile_id ? (loginOf.get(s.profile_id) ?? null) : null,
      detail: `${[s.school, s.grade].filter(Boolean).join(" ")} · 수강 ${cls.length}개${cls.length ? ` (${cls.slice(0, 2).join(", ")}${cls.length > 2 ? " 외" : ""})` : ""}`,
      lastSignIn: s.profile_id ? (signIn.get(s.profile_id) ?? null) : null,
    };
  });

  const parentRows: HqAccount[] = parents.map((p) => {
    const kids = links.filter((l) => l.parent_id === p.id).map((l) => studentName.get(l.student_id)).filter(Boolean);
    return {
      kind: "parent", profileId: p.profile_id, entityId: p.id, name: p.name, phone: p.phone,
      loginId: p.profile_id ? (loginOf.get(p.profile_id) ?? null) : null,
      detail: kids.length ? `자녀 ${kids.join(", ")}${kids.length > 1 ? " (형제)" : ""}` : "연결된 자녀 없음",
      lastSignIn: p.profile_id ? (signIn.get(p.profile_id) ?? null) : null,
    };
  });

  return [...staffRows, ...studentRows, ...parentRows].sort(byName);
}
