#!/usr/bin/env node
/**
 * 시연용 목업 데이터 — 지금 DB 의 강사·강좌·학생·학부모를 전부 지우고 다시 만든다.
 *
 *   node --env-file=.env.local supabase/seed-demo.mjs --yes
 *
 * 만드는 것 (대치 지점)
 *   강사 10명      t01 ~ t10   (강사마다 강좌 2~3개)
 *   조교 10명      a01 ~ a10   (강사마다 1명, 그 강사 강좌 1~2개 담당)
 *   학생 100명     s001 ~ s100 (강좌마다 10명, 모든 학생이 1개 이상 수강)
 *     └ 20명은 형제(10쌍) → 학부모 1명을 같이 쓴다
 *   학부모 90명    p001 ~ p090 (형제 10쌍 + 혼자 듣는 80명)
 *   강좌마다 8회차 수업 · 출결 · 주간 테스트 · 숙제 (지난 회차만 채점)
 *
 * 시연용 마스터: master / demo1234
 * 모든 계정 비밀번호: demo1234 (첫 로그인 비밀번호 변경 없음)
 * 학원 관리자 계정(admin)은 지우지 않는다.
 * 전화번호는 010-0000-XXXX — 실제로 존재하지 않는 번호라 문자를 눌러도 아무에게도 가지 않는다.
 *
 * 난수는 고정 시드라 몇 번을 돌려도 같은 데이터가 나온다.
 */
import { createClient } from "@supabase/supabase-js";

if (!process.argv.includes("--yes")) {
  console.error("DB 의 강사·강좌·학생·학부모를 전부 지워요. 진행하려면 --yes 를 붙여 주세요.");
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ID_DOMAIN = "id.sejung-lms.local";
const PASSWORD = "demo1234";
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const die = (what, error) => { if (error) { console.error(`${what} 실패:`, error.message ?? error); process.exit(1); } };
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

/* ── 고정 시드 난수 (mulberry32) ─────────────────── */
let seed = 20261008;
const rand = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (arr) => arr[rnd(0, arr.length - 1)];
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };

async function selectAll(table, select, filter = (q) => q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(db.from(table).select(select)).range(from, from + 999);
    die(`${table} 조회`, error);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}
async function insertAll(table, rows, select) {
  const out = [];
  for (const part of chunks(rows, 500)) {
    const q = db.from(table).insert(part);
    const { data, error } = select ? await q.select(select) : await q;
    die(`${table} 저장`, error);
    if (data) out.push(...data);
  }
  return out;
}
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }));
}

/* ── 1. 지우기 ───────────────────────────────────── */

const spaces0 = await selectAll("teacher_spaces", "id");
for (const part of chunks(spaces0.map((s) => s.id), 50)) die("강사 공간 삭제", (await db.from("teacher_spaces").delete().in("id", part)).error);
const students0 = await selectAll("students", "id");
for (const part of chunks(students0.map((s) => s.id), 300)) die("학생 삭제", (await db.from("students").delete().in("id", part)).error);
const parents0 = await selectAll("parents", "id");
for (const part of chunks(parents0.map((s) => s.id), 300)) die("학부모 삭제", (await db.from("parents").delete().in("id", part)).error);

// 관리자(admin)를 뺀 로그인 계정
const users = [];
for (let page = 1; ; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  die("계정 조회", error);
  users.push(...data.users);
  if (data.users.length < 1000) break;
}
const admins = new Set((await selectAll("profiles", "id", (q) => q.eq("role", "admin"))).map((p) => p.id));
const doomed = users.filter((u) => !admins.has(u.id));
await pool(doomed, 8, async (u) => { const { error } = await db.auth.admin.deleteUser(u.id); if (error) console.warn("계정 삭제 실패", u.email, error.message); });
log(`지움 — 공간 ${spaces0.length} · 학생 ${students0.length} · 학부모 ${parents0.length} · 계정 ${doomed.length}`);

/* ── 2. 지점 ─────────────────────────────────────── */

let { data: branch } = await db.from("branches").select("id").eq("name", "대치").maybeSingle();
if (!branch) ({ data: branch } = await db.from("branches").insert({ name: "대치" }).select("id").single());

/* ── 계정 만들기 ─────────────────────────────────── */

async function account(loginId, name, role) {
  const { data, error } = await db.auth.admin.createUser({
    email: `${loginId}@${ID_DOMAIN}`, password: PASSWORD, email_confirm: true,
    app_metadata: { role }, user_metadata: { full_name: name },
  });
  die(`계정 ${loginId}`, error);
  die(`프로필 ${loginId}`, (await db.from("profiles").update({ role, full_name: name, login_id: loginId }).eq("id", data.user.id)).error);
  return data.user.id;
}

/* ── 시연용 마스터 계정 master / demo1234 (관리자는 위에서 지우지 않으므로 없을 때만 만든다) ── */
{
  const { data: m } = await db.from("profiles").select("id").eq("login_id", "master").maybeSingle();
  if (!m) await account("master", "학원 관리자", "admin");
}

/* ── 3. 강사 · 조교 · 강좌 ────────────────────────── */

const TEACHERS = [
  { name: "김민준T", subject: "수학", color: "#3182f6" },
  { name: "이서연T", subject: "영어", color: "#7048e8" },
  { name: "박지훈T", subject: "국어", color: "#e8590c" },
  { name: "최유진T", subject: "과탐", color: "#0ca678" },
  { name: "정도현T", subject: "수학", color: "#1b64da" },
  { name: "강하은T", subject: "사탐", color: "#d6336c" },
  { name: "조성민T", subject: "영어", color: "#5f3dc4" },
  { name: "윤채원T", subject: "국어", color: "#c2410c" },
  { name: "장우진T", subject: "과탐", color: "#087f5b" },
  { name: "한소율T", subject: "수학", color: "#1971c2" },
];
const ASSISTANTS = ["박서윤", "김예준", "이하린", "최시우", "정지아", "강도윤", "조하준", "윤서아", "장민서", "한지호"];
const CLASS_TITLES = {
  수학: ["고1 수학 개념반", "고2 수학Ⅱ 심화반", "중3 선행 수학", "고3 미적분 실전반"],
  영어: ["고1 영어 내신반", "고2 독해 집중반", "수능 영어 빈칸추론", "중3 영문법 완성"],
  국어: ["고1 국어 문학반", "고2 독서 심화", "수능 국어 화작", "고3 언매 실전반"],
  과탐: ["물리학Ⅰ 개념완성", "화학Ⅰ 내신대비", "생명과학Ⅰ 심화", "지구과학Ⅰ 실전"],
  사탐: ["사회문화 개념반", "생활과 윤리 완성", "한국사 내신대비", "한국지리 실전"],
};
const ROOMS = ["대치관 101", "대치관 201", "대치관 301", "대치관 401", "본관 301", "본관 401", "양지관 102", "우전관 201"];
const SLOT_SETS = [["월", "수"], ["화", "목"], ["토"], ["일"], ["수", "금"], ["화"], ["목"]];
const TIMES = [["16:00", "18:00"], ["18:00", "20:00"], ["19:00", "22:00"], ["10:00", "13:00"], ["14:00", "17:00"]];

const today = new Date();
const ymd = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);

const spaceRows = TEACHERS.map((t, i) => ({
  branch_id: branch.id, name: t.name, subject: t.subject, subjects: [t.subject],
  slug: `demo-t${String(i + 1).padStart(2, "0")}`, accent_color: t.color, sort_order: i + 1,
  phone: `010-0000-${String(1001 + i)}`, corporation: i % 3 === 2 ? "㈜세정스카이학원" : "㈜세정학원",
  hired_on: ymd(addDays(today, -rnd(200, 1500))), employment: "재직", is_active: true,
}));
const spaces = await insertAll("teacher_spaces", spaceRows, "id, name, subject, slug");
spaces.sort((a, b) => a.slug.localeCompare(b.slug));

const classes = [];
for (const [i, sp] of spaces.entries()) {
  const teacherId = await account(`t${String(i + 1).padStart(2, "0")}`, sp.name.replace(/T$/, ""), "teacher");
  die("주 강사 지정", (await db.from("teacher_spaces").update({ owner_id: teacherId, email: null }).eq("id", sp.id)).error);
  sp.teacherId = teacherId;
  sp.assistantId = await account(`a${String(i + 1).padStart(2, "0")}`, ASSISTANTS[i], "assistant");
  die("조교 배정", (await db.from("space_staff").insert({
    space_id: sp.id, profile_id: sp.assistantId, staff_role: "assistant", can_grade: true, can_manage_students: false,
  })).error);

  const titles = shuffle(CLASS_TITLES[sp.subject]).slice(0, rnd(2, 3));
  for (const title of titles) {
    const days = pick(SLOT_SETS); const [st, en] = pick(TIMES); const room = pick(ROOMS);
    const starts = addDays(today, -rnd(35, 56));
    classes.push({
      space_id: sp.id, branch_id: branch.id, title, subject: sp.subject,
      kind: rand() < 0.75 ? "regular" : "special",
      description: `${days.join("·")} ${st} · ${room}`,
      slots: days.map((d) => ({ weekday: d, start_time: st, end_time: en, room_name: room })),
      starts_on: ymd(starts), ends_on: ymd(addDays(starts, 7 * 8)),
      total_sessions: 8, price_per_session: pick([35000, 40000, 45000, 50000, 60000]), capacity: 10, is_closed: false,
    });
  }
}
const classRows = await insertAll("classes", classes, "id, space_id, title, slots, starts_on");
log(`강사 ${spaces.length}명 · 조교 ${spaces.length}명 · 강좌 ${classRows.length}개`);

/* ── 4. 학생 100명 · 형제 10쌍 · 학부모 90명 ──────── */

const SUR = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"];
const GIVEN = ["도윤", "서준", "하은", "지우", "예진", "하람", "채원", "지호", "지안", "하준", "서윤", "준서", "아린", "태윤", "유나", "시우", "예린", "승현", "하윤", "민준",
  "서아", "현우", "지민", "수아", "은우", "지유", "건우", "다은", "윤서", "주원", "소율", "우진", "나은", "선우", "채아", "도현", "연우", "민서", "이준", "가은"];
const SCHOOLS = [["대치중", "중"], ["역삼중", "중"], ["대명중", "중"], ["숙명여중", "중"], ["휘문고", "고"], ["경기고", "고"], ["단대부고", "고"], ["숙명여고", "고"], ["중동고", "고"], ["은광여고", "고"]];

const names = new Set();
const people = [];
while (people.length < 100) {
  const n = pick(SUR) + pick(GIVEN);
  if (names.has(n)) continue;
  names.add(n);
  const [school, level] = pick(SCHOOLS);
  people.push({ name: n, school, grade: `${level}${level === "중" ? rnd(2, 3) : rnd(1, 3)}` });
}
// 앞 20명 = 형제 10쌍 — 같은 성, 학년 차이
for (let k = 0; k < 10; k++) {
  const a = people[k * 2], b = people[k * 2 + 1];
  const sur = a.name[0];
  let n = sur + pick(GIVEN);
  while (names.has(n)) n = sur + pick(GIVEN);
  names.delete(b.name); names.add(n);
  b.name = n;
}

const studentRows = people.map((p, i) => ({
  branch_id: branch.id, name: p.name, school: p.school, grade: p.grade, status: "active",
  phone: `010-0000-${String(3001 + i)}`,
}));
const students = await insertAll("students", studentRows, "id, name");
// insert 는 순서를 지킨다
students.forEach((s, i) => { s.no = i + 1; s.sibling = i < 20 ? Math.floor(i / 2) : null; });

await pool(students, 8, async (s) => {
  const uid = await account(`s${String(s.no).padStart(3, "0")}`, s.name, "student");
  die("학생 연결", (await db.from("students").update({ profile_id: uid }).eq("id", s.id)).error);
});

// 학부모: 형제 10쌍 → 10명, 혼자 듣는 80명 → 80명
const parentPlan = [];
for (let k = 0; k < 10; k++) parentPlan.push({ kids: [students[k * 2], students[k * 2 + 1]] });
for (const s of students.slice(20)) parentPlan.push({ kids: [s] });
const parentRows = parentPlan.map((p, i) => ({
  name: `${p.kids[0].name} 학부모`, phone: `010-0000-${String(5001 + i)}`,
}));
const parents = await insertAll("parents", parentRows, "id, name");
await insertAll("parent_links", parents.flatMap((p, i) => parentPlan[i].kids.map((k, j) => ({
  parent_id: p.id, student_id: k.id, relation: (i + j) % 3 === 0 ? "부" : "모",
}))));
await pool(parents, 8, async (p, i) => {
  const uid = await account(`p${String(i + 1).padStart(3, "0")}`, p.name, "parent");
  die("학부모 연결", (await db.from("parents").update({ profile_id: uid }).eq("id", p.id)).error);
});
log(`학생 ${students.length}명 (형제 10쌍) · 학부모 ${parents.length}명`);

/* ── 5. 수강 — 강좌마다 10명, 모든 학생 1개 이상 ──── */

const members = new Map(classRows.map((c) => [c.id, new Set()]));
let queue = shuffle(students);
for (const c of shuffle(classRows)) {
  const set = members.get(c.id);
  while (set.size < 10) {
    if (!queue.length) queue = shuffle(students);
    const s = queue.shift();
    if (!set.has(s)) set.add(s);
  }
}
// 형제는 같은 강사 수업을 하나쯤 같이 듣게 — 학부모 화면의 자녀 전환을 보여주려고
for (let k = 0; k < 10; k += 3) {
  const [a, b] = [students[k * 2], students[k * 2 + 1]];
  const c = classRows.find((x) => members.get(x.id).has(a) && !members.get(x.id).has(b));
  if (!c) continue;
  const set = members.get(c.id);
  // 빼는 학생은 다른 강좌도 듣는 학생이어야 한다 — 수강 0개가 되면 안 된다
  const classesOf = (s) => classRows.filter((x) => members.get(x.id).has(s)).length;
  const out = [...set].find((s) => s !== a && s.sibling == null && classesOf(s) > 1);
  if (out) { set.delete(out); set.add(b); }
}
const memberRows = classRows.flatMap((c) => [...members.get(c.id)].map((s) => ({ class_id: c.id, space_id: c.space_id, student_id: s.id, enrolled_on: c.starts_on })));
await insertAll("class_members", memberRows);
const enr = new Set(memberRows.map((m) => `${m.student_id}|${m.space_id}`));
await insertAll("enrollments", [...enr].map((k) => { const [student_id, space_id] = k.split("|"); return { student_id, space_id, status: "active" }; }));
log(`수강 ${memberRows.length}건 · 강사 공간 등록 ${enr.size}건`);

// 조교 담당 강좌 1~2개
const csRows = [];
for (const sp of spaces) {
  const own = classRows.filter((c) => c.space_id === sp.id);
  for (const c of shuffle(own).slice(0, Math.min(own.length, rnd(1, 2)))) csRows.push({ class_id: c.id, space_id: sp.id, profile_id: sp.assistantId });
}
await insertAll("class_staff", csRows);

/* ── 6. 수업 활동 — 8회차, 지난 회차만 출결·채점 ──── */

const WD = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
const ATT = ["present", "present", "present", "present", "present", "video", "late", "absent"];
let nSess = 0, nAtt = 0, nRes = 0, nSub = 0;

for (const c of classRows) {
  const kids = [...members.get(c.id)];
  const slot = c.slots[0];
  // 개강일 이후 첫 수업 요일부터 주 1회 8회차
  let d = new Date(`${c.starts_on}T00:00:00Z`);
  while (d.getUTCDay() !== WD[slot.weekday]) d = addDays(d, 1);
  const [hh, mm] = slot.start_time.split(":").map(Number);
  const sessions = await insertAll("sessions", Array.from({ length: 8 }, (_, n) => ({
    class_id: c.id, space_id: c.space_id, session_no: n + 1, title: `${n + 1}회차`,
    scheduled_at: new Date(addDays(d, n * 7).getTime() + (hh - 9) * 3600e3 + mm * 60e3).toISOString(),
  })), "id, session_no, scheduled_at");
  sessions.sort((a, b) => a.session_no - b.session_no);
  nSess += sessions.length;
  const past = sessions.filter((s) => new Date(s.scheduled_at) < today);

  // 학생마다 실력 차이가 보이게 기본 점수를 둔다
  const base = new Map(kids.map((k) => [k.id, rnd(12, 27)]));

  await insertAll("attendance", past.flatMap((s) => kids.map((k) => {
    const status = pick(ATT);
    return { space_id: c.space_id, session_id: s.id, student_id: k.id, status, marked_at: s.scheduled_at };
  })));
  nAtt += past.length * kids.length;

  const exams = await insertAll("exams", past.map((s) => ({
    space_id: c.space_id, session_id: s.id, title: `${c.title} ${s.session_no}회 주간테스트`, exam_type: "주간테스트",
    max_score: 30, cutoff_score: 18, score_status: "open", exam_date: s.scheduled_at.slice(0, 10),
  })), "id, session_id");
  const results = exams.flatMap((e, i) => kids.map((k) => ({
    exam_id: e.id, student_id: k.id,
    score: Math.max(6, Math.min(30, base.get(k.id) + rnd(-5, 5) + Math.round(i * 0.4))),
    graded_at: addDays(new Date(past[i].scheduled_at), 1).toISOString(),
  })));
  await insertAll("exam_results", results);
  nRes += results.length;

  const asgs = await insertAll("assignments", past.map((s) => ({
    space_id: c.space_id, session_id: s.id, title: `${s.session_no}회차 숙제`, description: "교재 해당 단원 + 오답노트",
    due_date: ymd(addDays(new Date(s.scheduled_at), 6)),
  })), "id, due_date");
  const subs = asgs.flatMap((a) => kids.map((k) => {
    const r = rand();
    const status = a.due_date > ymd(today) ? (r < 0.5 ? "submitted" : "pending") : r < 0.75 ? "submitted" : r < 0.9 ? "late" : "pending";
    return { assignment_id: a.id, student_id: k.id, status, submitted_at: status === "pending" ? null : addDays(new Date(`${a.due_date}T09:00:00Z`), -rnd(0, 4)).toISOString() };
  }));
  await insertAll("submissions", subs);
  nSub += subs.length;
}

await insertAll("notices", spaces.map((sp) => ({
  space_id: sp.id, title: "이번 주 숙제 제출 안내", body: "수업 전까지 오답노트를 제출해 주세요.", audience: "all",
})));
log(`수업 ${nSess}회 · 출결 ${nAtt} · 성적 ${nRes} · 숙제 제출 ${nSub}`);
log(`완료 — 모든 계정 비밀번호 ${PASSWORD}`);
