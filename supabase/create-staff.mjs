#!/usr/bin/env node
/**
 * 운영진(학원 관리자·선생님·조교) 계정 만들기.
 *
 *   node --env-file=.env.local supabase/create-staff.mjs \
 *     --email teacher@example.com --name "백쌤" --role teacher --spaces baek-chem [--owner]
 *
 *   --role   admin | teacher | assistant
 *            admin 은 모든 공간에 들어간다 (--spaces 불필요)
 *   --spaces 들어갈 공간 slug, 쉼표로 여러 개
 *   --owner  선생님을 그 공간의 주인(teacher_spaces.owner_id)으로. 아니면 space_staff 로 붙인다
 *
 * 임시 비밀번호를 만들어 한 번만 출력한다. 첫 로그인 때 본인이 바꾼다.
 * 이미 있는 이메일이면 계정은 그대로 두고 역할·공간 배정만 맞춘다.
 */
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] == null ? true : all[i + 1]]);
    return acc;
  }, []),
);

const email = String(args.email ?? "").trim().toLowerCase();
const name = String(args.name ?? "").trim();
const role = String(args.role ?? "");
const slugs = args.spaces && args.spaces !== true ? String(args.spaces).split(",").map((s) => s.trim()).filter(Boolean) : [];
const owner = args.owner === true;

if (!email.includes("@") || !name || !["admin", "teacher", "assistant"].includes(role)) {
  console.error("사용법: --email <이메일> --name <이름> --role admin|teacher|assistant [--spaces slug,slug] [--owner]");
  process.exit(1);
}
if (role !== "admin" && !slugs.length) {
  console.error("선생님·조교는 --spaces 로 들어갈 공간을 정해 주세요");
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const die = (what, error) => { if (error) { console.error(`${what} 실패:`, error.message); process.exit(1); } };

// 이미 있는 계정인가
let userId = null;
for (let page = 1; !userId; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  die("사용자 조회", error);
  userId = data.users.find((u) => u.email === email)?.id ?? null;
  if (data.users.length < 200) break;
}

let password = null;
if (!userId) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  password = Array.from({ length: 10 }, () => chars[randomInt(chars.length)]).join("");
  const { data, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: name, must_change_password: true },
  });
  die("계정 생성", error);
  userId = data.user.id;
} else {
  const { error } = await db.auth.admin.updateUserById(userId, { app_metadata: { role } });
  die("역할 갱신", error);
}

die("프로필", (await db.from("profiles").update({ role, full_name: name, login_id: email }).eq("id", userId)).error);

for (const slug of slugs) {
  const { data: sp, error } = await db.from("teacher_spaces").select("id, name").eq("slug", slug).maybeSingle();
  die(`공간 ${slug}`, error);
  if (!sp) { console.error(`공간 ${slug} 이(가) 없어요`); process.exit(1); }
  if (owner) {
    die("공간 주인 지정", (await db.from("teacher_spaces").update({ owner_id: userId }).eq("id", sp.id)).error);
  } else {
    die("공간 배정", (await db.from("space_staff").upsert({
      space_id: sp.id, profile_id: userId,
      staff_role: role === "assistant" ? "assistant" : "teacher",
      can_grade: true,
      can_manage_students: role === "teacher",
    }, { onConflict: "space_id,profile_id" })).error);
  }
  console.log(`  · ${sp.name} (${slug}) ${owner ? "주인" : role === "assistant" ? "조교" : "선생님"}`);
}

console.log(`\n${name} <${email}> · ${role}`);
console.log(password ? `임시 비밀번호: ${password}  (첫 로그인 때 바꾸게 됩니다)` : "이미 있던 계정 — 비밀번호는 그대로입니다");
