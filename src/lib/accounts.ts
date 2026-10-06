import "server-only";
import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginEmail } from "@/lib/auth";

/**
 * 학생·학부모 계정 발급.
 *
 * 아이디: 휴대폰 번호(숫자만)가 있으면 그걸로, 없거나 이미 쓰였으면 s123456 / p123456 형태.
 * 비밀번호: 학원이 정하지 않는다 — 무작위 임시 비밀번호를 만들어 한 번만 보여주고,
 *          첫 로그인에서 본인이 바꾸게 한다(user_metadata.must_change_password).
 */

const db = () => createAdminClient();

export type AccountRow = {
  kind: "student" | "parent";
  /** students.id 또는 parents.id */
  id: string;
  name: string;
  /** 학부모 행이면 자녀 이름 */
  of: string | null;
  phone: string | null;
  profileId: string | null;
  loginId: string | null;
};

export type IssuedCredential = { kind: "student" | "parent"; name: string; loginId: string; password: string };

/** 이 공간 수강생과 그 보호자의 계정 현황 */
export async function getAccountRoster(spaceId: string): Promise<AccountRow[]> {
  const { data: enr } = await db()
    .from("enrollments")
    .select("students!inner(id, name, phone, profile_id, parent_links(parents(id, name, phone, profile_id)))")
    .eq("space_id", spaceId)
    .eq("status", "active");

  type P = { id: string; name: string; phone: string | null; profile_id: string | null };
  type S = P & { parent_links: { parents: P | P[] | null }[] };
  const students = (enr ?? []).flatMap((r: { students: S | S[] }) => (Array.isArray(r.students) ? r.students : [r.students]));

  const rows: AccountRow[] = [];
  const seenParent = new Set<string>();
  for (const s of students.sort((a, b) => a.name.localeCompare(b.name, "ko"))) {
    rows.push({ kind: "student", id: s.id, name: s.name, of: null, phone: s.phone, profileId: s.profile_id, loginId: null });
    for (const l of s.parent_links ?? []) {
      for (const p of [l.parents].flat()) {
        if (!p || seenParent.has(p.id)) continue;
        seenParent.add(p.id);
        rows.push({ kind: "parent", id: p.id, name: p.name, of: s.name, phone: p.phone, profileId: p.profile_id, loginId: null });
      }
    }
  }

  const pids = rows.map((r) => r.profileId).filter((x): x is string => !!x);
  if (pids.length) {
    const { data: profs } = await db().from("profiles").select("id, login_id").in("id", pids);
    const byId = new Map((profs ?? []).map((p: { id: string; login_id: string | null }) => [p.id, p.login_id]));
    for (const r of rows) if (r.profileId) r.loginId = byId.get(r.profileId) ?? null;
  }
  return rows;
}

/* ── 아이디 · 비밀번호 만들기 ───────────────────── */

/** 헷갈리는 글자(0/O, 1/l/I)는 뺀다 — 종이에 적어 건네주는 비밀번호라서 */
const PW_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

export function tempPassword(len = 8) {
  return Array.from({ length: len }, () => PW_CHARS[randomInt(PW_CHARS.length)]).join("");
}

const mobile = (phone: string | null) => {
  const d = (phone ?? "").replace(/\D/g, "");
  return /^01\d{8,9}$/.test(d) ? d : null;
};

async function loginIdTaken(id: string) {
  const { count } = await db().from("profiles").select("id", { count: "exact", head: true }).eq("login_id", id);
  return (count ?? 0) > 0;
}

async function pickLoginId(kind: "student" | "parent", phone: string | null) {
  const m = mobile(phone);
  if (m && !(await loginIdTaken(m))) return m;
  for (let i = 0; i < 20; i++) {
    const id = `${kind === "student" ? "s" : "p"}${randomInt(100000, 1000000)}`;
    if (!(await loginIdTaken(id))) return id;
  }
  throw new Error("아이디를 만들지 못했어요. 다시 시도해 주세요");
}

/* ── 발급 ─────────────────────────────────────── */

export async function issueAccount(row: AccountRow): Promise<IssuedCredential> {
  const loginId = await pickLoginId(row.kind, row.phone);
  const password = tempPassword();

  const { data, error } = await db().auth.admin.createUser({
    email: loginEmail(loginId),
    password,
    email_confirm: true,
    // 역할은 app_metadata 로만 — 사용자가 고칠 수 없는 칸 (마이그레이션 20261006120000 참고)
    app_metadata: { role: row.kind },
    user_metadata: { full_name: row.name, must_change_password: true },
  });
  if (error || !data.user) throw new Error(`${row.name} 계정을 만들지 못했어요: ${error?.message ?? ""}`);

  const uid = data.user.id;
  await db().from("profiles").update({ login_id: loginId, full_name: row.name }).eq("id", uid);
  const table = row.kind === "student" ? "students" : "parents";
  const { error: linkErr } = await db().from(table).update({ profile_id: uid }).eq("id", row.id).is("profile_id", null);
  if (linkErr) {
    // 연결에 실패한 계정은 남기지 않는다 — 로그인은 되는데 아무것도 안 보이는 계정이 생기면 안 된다
    await db().auth.admin.deleteUser(uid);
    throw new Error(`${row.name} 계정 연결 실패: ${linkErr.message}`);
  }
  return { kind: row.kind, name: row.name, loginId, password };
}

export async function resetAccountPassword(row: AccountRow): Promise<IssuedCredential> {
  if (!row.profileId || !row.loginId) throw new Error("아직 발급되지 않은 계정이에요");
  const password = tempPassword();
  const { error } = await db().auth.admin.updateUserById(row.profileId, {
    password,
    user_metadata: { must_change_password: true },
  });
  if (error) throw new Error(`비밀번호를 바꾸지 못했어요: ${error.message}`);
  return { kind: row.kind, name: row.name, loginId: row.loginId, password };
}
