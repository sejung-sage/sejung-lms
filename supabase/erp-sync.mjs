#!/usr/bin/env node
/**
 * ERP(세정ERP) → LMS 동기화.
 *
 *   node --env-file=.env.local supabase/erp-sync.mjs [--purge-demo] [--branch daechi,banpo]
 *
 * 가져오는 것 (지점별)
 *   강사  → teacher_spaces  (ERP 강사 1명 = LMS 강사 공간 1개)
 *   강좌  → classes         (요일·시간·강의실·수강료·정원·종강 여부 그대로)
 *   수강생 → students · enrollments · class_members
 *   학부모 → parents · parent_links
 *
 * 번호: ERP 목록은 휴대폰 번호를 가린다(010-****-1234). 전체 번호는 CRM DB(ACA2000 원본,
 * aca_students)에서 이름 + 끝 4자리로 찾아 붙인다 — ERP 학생 상세를 한 명씩 열지 않으므로
 * ERP 개인정보 접근 기록이 쌓이지 않는다.
 *
 * 다시 돌려도 된다: erp_* 키로 같은 row 를 갱신한다. LMS 에서 직접 만든 강사·강좌(erp_* 없음),
 * 강사 공간 주인(owner_id)·조교 배정·성적·출결은 건드리지 않는다.
 *
 * --purge-demo  시연용 가짜 데이터(erp_* 가 없는 공간·학생·학부모)를 지운다.
 *
 * 필요한 환경변수: ERP_URL ERP_EMAIL ERP_PASSWORD CRM_SUPABASE_URL CRM_SUPABASE_SECRET_KEY
 *                 NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const argv = process.argv.slice(2);
const PURGE = argv.includes("--purge-demo");
const onlyBranches = (() => { const i = argv.indexOf("--branch"); return i >= 0 ? argv[i + 1].split(",") : null; })();

const need = ["ERP_URL", "ERP_EMAIL", "ERP_PASSWORD", "CRM_SUPABASE_URL", "CRM_SUPABASE_SECRET_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) { console.error("환경변수가 없어요:", missing.join(", ")); process.exit(1); }

const lms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const crm = createClient(process.env.CRM_SUPABASE_URL, process.env.CRM_SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const now = new Date().toISOString();
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const die = (what, error) => { if (error) { console.error(`${what} 실패:`, error.message ?? error); process.exit(1); } };

/* ── ERP API ─────────────────────────────────────── */

const ERP = process.env.ERP_URL.replace(/\/$/, "");
let cookie = "";
async function erpLogin() {
  const r = await fetch(`${ERP}/v1/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.ERP_EMAIL, password: process.env.ERP_PASSWORD }),
  });
  if (!r.ok) die("ERP 로그인", `${r.status} ${await r.text()}`);
  cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
}
async function erp(path, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(`${ERP}${path}`, { headers: { cookie } });
      if (r.status === 401 && i < tries) { await erpLogin(); continue; }
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw new Error(`ERP ${path}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 500 * i));
    }
  }
}
/** ERP 는 page_size 를 200 으로 자른다 — 돌려받은 page_size·total 기준으로 끝을 판단한다 */
async function erpPaged(path, key, pageSize = 200) {
  const out = [];
  for (let page = 1; ; page++) {
    const j = await erp(`${path}${path.includes("?") ? "&" : "?"}page=${page}&page_size=${pageSize}`);
    const rows = j[key] ?? [];
    out.push(...rows);
    const size = j.page_size ?? pageSize;
    if (!rows.length || rows.length < size || (j.total != null && out.length >= j.total)) return out;
  }
}
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      if (++done % 200 === 0) log(`  … ${done}/${items.length}`);
    }
  }));
  return out;
}

/* ── 공용 ────────────────────────────────────────── */

const digits = (s) => String(s ?? "").replace(/\D/g, "");
const last4 = (s) => { const d = digits(s); return d.length >= 4 ? d.slice(-4) : ""; };
const fmtPhone = (s) => { const d = digits(s); return /^01\d{8,9}$/.test(d) ? d.replace(/^(\d{3})(\d{3,4})(\d{4})$/, "$1-$2-$3") : null; };
const realPhone = (s) => { const p = fmtPhone(s); return p && !/^010-0000-/.test(p) && !/^010-0012-/.test(p) ? p : null; };
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const short = (s) => createHash("sha1").update(s).digest("hex").slice(0, 8);

async function upsertAll(table, rows, onConflict, select) {
  const out = [];
  for (const part of chunks(rows, 500)) {
    const q = lms.from(table).upsert(part, { onConflict });
    const { data, error } = select ? await q.select(select) : await q;
    die(`${table} 저장`, error);
    if (data) out.push(...data);
  }
  return out;
}
async function lmsAll(table, select, filter = (q) => q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(lms.from(table).select(select)).range(from, from + 999);
    die(`${table} 조회`, error);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

/** 과목별 테마색 — 런처 아이콘이 과목끼리 비슷한 색으로 모이게 */
const SUBJECT_COLOR = {
  수학: "#3182f6", 국어: "#e8590c", 영어: "#7048e8", 과탐: "#0ca678", 사탐: "#d6336c",
  한국사: "#c2255c", 제2외국어: "#1098ad", 컨설팅: "#495057", 독학관: "#5c7cfa", 기타: "#868e96",
};

/* ── 1. 지점 ─────────────────────────────────────── */

await erpLogin();
log("ERP 로그인 완료");

const { branches: erpBranches } = await erp("/v1/branches");
const branchRows = await lmsAll("branches", "id, name, erp_id");
const branchOf = new Map(); // erp branch id → lms branch id
for (const b of erpBranches.filter((x) => !x.deleted && (!onlyBranches || onlyBranches.includes(x.id)))) {
  let row = branchRows.find((r) => r.erp_id === b.id) ?? branchRows.find((r) => r.name === b.short_name);
  if (!row) {
    const { data, error } = await lms.from("branches").insert({ name: b.short_name, erp_id: b.id }).select("id, name, erp_id").single();
    die("지점 생성", error);
    row = data;
  } else if (row.erp_id !== b.id) {
    die("지점 연결", (await lms.from("branches").update({ erp_id: b.id }).eq("id", row.id)).error);
  }
  branchOf.set(b.id, { lmsId: row.id, name: b.short_name });
}
log("지점", [...branchOf.values()].map((b) => b.name).join(", "));

/* ── 0. 시연용 데이터 정리 ───────────────────────── */

if (PURGE) {
  const demo = await lmsAll("teacher_spaces", "id, name", (q) => q.is("erp_teacher_id", null));
  for (const part of chunks(demo.map((d) => d.id), 100)) die("시연 공간 삭제", (await lms.from("teacher_spaces").delete().in("id", part)).error);
  const demoStudents = await lmsAll("students", "id", (q) => q.is("erp_student_id", null));
  for (const part of chunks(demoStudents.map((d) => d.id), 200)) die("시연 학생 삭제", (await lms.from("students").delete().in("id", part)).error);
  const demoParents = await lmsAll("parents", "id", (q) => q.is("erp_key", null));
  for (const part of chunks(demoParents.map((d) => d.id), 200)) die("시연 학부모 삭제", (await lms.from("parents").delete().in("id", part)).error);
  log(`시연 데이터 삭제 — 공간 ${demo.length} · 학생 ${demoStudents.length} · 학부모 ${demoParents.length}`);
}

/* ── CRM 학생(전체 번호) 색인 ─────────────────────── */

const crmIndex = new Map();
async function loadCrm(branchName) {
  let n = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await crm.from("aca_students")
      .select("aca2000_id, name, phone, parent_phone, school, grade, status")
      .eq("branch", branchName).range(from, from + 999);
    die("CRM 학생 조회", error);
    for (const s of data) {
      n++;
      for (const k of [last4(s.parent_phone), last4(s.phone)].filter(Boolean)) {
        const key = `${branchName}|${s.name}|${k}`;
        // 같은 키가 둘 이상이면 재원생 쪽을 쓴다
        if (!crmIndex.has(key) || s.status === "재원생") crmIndex.set(key, s);
      }
      const sk = `${branchName}|${s.name}|@${s.school ?? ""}`;
      crmIndex.set(sk, crmIndex.has(sk) && crmIndex.get(sk) !== s ? "dup" : s);
    }
    if (data.length < 1000) return n;
  }
}
function crmMatch(branchName, st) {
  for (const k of [...(st.parents ?? []).flatMap((p) => p.phones ?? []).map(last4), last4(st.phone)].filter(Boolean)) {
    const hit = crmIndex.get(`${branchName}|${st.name}|${k}`);
    if (hit) return hit;
  }
  const bySchool = crmIndex.get(`${branchName}|${st.name}|@${st.school ?? ""}`);
  return bySchool && bySchool !== "dup" ? bySchool : null;
}

/* ── 지점별 동기화 ───────────────────────────────── */

const total = { teachers: 0, classes: 0, students: 0, matched: 0, parents: 0, members: 0, enrollments: 0, skipped: 0 };

for (const [erpBranch, { lmsId: branchId, name: branchName }] of branchOf) {
  log(`━━ ${branchName} (${erpBranch})`);

  /* 강사 */
  const teachers = [
    ...(await erpPaged(`/v1/teachers?branch=${erpBranch}`, "teachers")),
    ...(await erpPaged(`/v1/teachers?branch=${erpBranch}&status=${encodeURIComponent("퇴사")}`, "teachers")),
  ];
  const seen = new Set();
  const spaceRows = teachers.filter((t) => !seen.has(t.teacher_id) && seen.add(t.teacher_id)).map((t) => {
    const subjects = t.subjects ?? [];
    return {
      erp_teacher_id: `${erpBranch}:${t.teacher_id}`,
      branch_id: branchId,
      name: t.name.replace(/\(퇴\)$/, "").trim(),
      subject: subjects[0] ?? null,
      subjects,
      phone: realPhone(t.contacts?.[0]?.phone),
      corporation: t.corporation_name ?? null,
      employment: t.status === "퇴사" ? "퇴사" : "재직",
      is_active: t.status !== "퇴사",
      slug: `${erpBranch}-${short(t.teacher_id)}`,
      accent_color: SUBJECT_COLOR[subjects[0]] ?? SUBJECT_COLOR.기타,
      synced_at: now,
    };
  });
  const spaces = await upsertAll("teacher_spaces", spaceRows, "erp_teacher_id", "id, erp_teacher_id");
  const spaceOf = new Map(spaces.map((s) => [s.erp_teacher_id, s.id]));
  total.teachers += spaces.length;
  log(`강사 ${spaces.length}명`);

  /* 강좌 + 수강생 명단 */
  const list = await erpPaged(`/v1/classes?branch=${erpBranch}`, "classes");
  log(`강좌 ${list.length}개 — 상세(수강생) 가져오는 중`);
  const details = await pool(list, 8, (c) => erp(`/v1/classes/${encodeURIComponent(c.id)}?branch=${erpBranch}`).catch((e) => { console.warn(" ", e.message); return null; }));

  const classRows = [];
  const roster = []; // { erpClassId, student, startedAt, closed, spaceId }
  for (const d of details) {
    if (!d) { total.skipped++; continue; }
    const spaceId = d.teachers?.map((t) => spaceOf.get(`${erpBranch}:${t.id}`)).find(Boolean);
    if (!spaceId) { total.skipped++; continue; }
    const dates = (d.dates ?? []).map((x) => (typeof x === "string" ? x : x?.date)).filter(Boolean).sort();
    classRows.push({
      erp_class_id: d.id,
      space_id: spaceId,
      branch_id: branchId,
      title: d.name,
      subject: d.subject ?? null,
      subject_detail: d.subject_detail ?? null,
      kind: d.kind === "special" ? "special" : "regular",
      starts_on: d.starts_on ?? dates[0] ?? null,
      ends_on: d.ends_on ?? dates[dates.length - 1] ?? null,
      total_sessions: d.total_sessions ?? null,
      price_per_session: d.price_per_session ?? null,
      capacity: d.capacity ?? null,
      is_closed: !!d.is_closed,
      recruitment: d.recruitment ?? null,
      slots: (d.slots ?? []).map((s) => ({ weekday: s.weekday, start_time: s.start_time, end_time: s.end_time, room_name: s.room_name ?? null })),
      synced_at: now,
    });
    for (const s of d.students ?? []) roster.push({ erpClassId: d.id, student: s, startedAt: s.started_at ?? null, closed: !!d.is_closed, spaceId });
  }
  const classes = await upsertAll("classes", classRows, "erp_class_id", "id, erp_class_id");
  const classOf = new Map(classes.map((c) => [c.erp_class_id, c.id]));
  total.classes += classes.length;
  log(`강좌 ${classes.length}개 저장 · 명단 ${roster.length}건`);

  /* 학생 — 재원생 목록 + 강좌 명단에 나오는 학생 */
  const active = await erpPaged(`/v1/students?branch=${erpBranch}`, "students");
  const byId = new Map();
  for (const s of active) byId.set(s.id, { ...s, active: s.status === "active" });
  for (const r of roster) if (!byId.has(r.student.id)) byId.set(r.student.id, { ...r.student, active: false });

  const crmN = await loadCrm(branchName);
  log(`학생 ${byId.size}명 (CRM ${crmN}명과 번호 대조)`);

  const studentRows = [];
  const parentOf = new Map(); // erp student id → [{ phone, role, name }]
  for (const s of byId.values()) {
    const c = crmMatch(branchName, s);
    if (c) total.matched++;
    studentRows.push({
      erp_student_id: s.id,
      aca_id: c?.aca2000_id ?? null,
      branch_id: branchId,
      name: s.name,
      school: s.school ?? c?.school ?? null,
      grade: c?.grade ?? s.grade ?? null,
      phone: realPhone(c?.phone),
      status: s.active ? "active" : "inactive",
      synced_at: now,
    });
    const pp = realPhone(c?.parent_phone);
    if (pp) {
      const ep = (s.parents ?? []).find((p) => (p.phones ?? []).some((x) => last4(x) === last4(pp))) ?? s.parents?.[0];
      parentOf.set(s.id, [{ phone: pp, role: ep?.role ?? null, name: ep?.name ?? null }]);
    }
  }
  const students = await upsertAll("students", studentRows, "erp_student_id", "id, erp_student_id, name");
  const studentOf = new Map(students.map((s) => [s.erp_student_id, s]));
  total.students += students.length;

  /* 수강 — 강사 공간 단위(enrollments) · 강좌 단위(class_members) */
  const enr = new Map(); // `${student}|${space}` → active?
  const members = new Map();
  for (const r of roster) {
    const st = studentOf.get(r.student.id);
    const cls = classOf.get(r.erpClassId);
    if (!st || !cls) continue;
    const k = `${st.id}|${r.spaceId}`;
    enr.set(k, (enr.get(k) ?? false) || !r.closed);
    members.set(`${cls}|${st.id}`, { class_id: cls, space_id: r.spaceId, student_id: st.id, enrolled_on: r.startedAt });
  }
  const enrRows = [...enr].map(([k, isActive]) => {
    const [student_id, space_id] = k.split("|");
    return { student_id, space_id, status: isActive ? "active" : "ended" };
  });
  await upsertAll("enrollments", enrRows, "student_id,space_id");
  // ERP 에서 빠진 수강은 종료로
  const branchSpaceIds = [...spaceOf.values()];
  const existing = [];
  for (const part of chunks(branchSpaceIds, 100)) existing.push(...await lmsAll("enrollments", "id, student_id, space_id, status", (q) => q.in("space_id", part).eq("status", "active")));
  const stale = existing.filter((e) => !enr.get(`${e.student_id}|${e.space_id}`)).map((e) => e.id);
  for (const part of chunks(stale, 200)) die("수강 종료 처리", (await lms.from("enrollments").update({ status: "ended" }).in("id", part)).error);
  total.enrollments += enrRows.length;

  const classIds = [...classOf.values()];
  for (const part of chunks(classIds, 200)) die("강좌 명단 비우기", (await lms.from("class_members").delete().in("class_id", part)).error);
  await upsertAll("class_members", [...members.values()], "class_id,student_id");
  total.members += members.size;
  log(`수강 ${enrRows.length}건 · 강좌 명단 ${members.size}건`);

  /* 학부모 — 같은 번호면 같은 학부모(형제) */
  const parentRows = new Map();
  for (const [erpId, ps] of parentOf) {
    const st = studentOf.get(erpId);
    for (const p of ps) {
      const key = digits(p.phone);
      if (!parentRows.has(key)) parentRows.set(key, { erp_key: key, name: p.name || `${st.name} 학부모`, phone: p.phone });
    }
  }
  const parents = await upsertAll("parents", [...parentRows.values()], "erp_key", "id, erp_key");
  const parentId = new Map(parents.map((p) => [p.erp_key, p.id]));
  const links = [];
  for (const [erpId, ps] of parentOf) {
    const st = studentOf.get(erpId);
    for (const p of ps) links.push({ parent_id: parentId.get(digits(p.phone)), student_id: st.id, relation: p.role });
  }
  await upsertAll("parent_links", links.filter((l) => l.parent_id), "parent_id,student_id");
  total.parents += parents.length;
  log(`학부모 ${parents.length}명`);
}

log("완료", JSON.stringify(total));
