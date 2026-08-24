// 세정 LMS — psql 없이 돌리는 시드 (supabase-js + service_role).
// 실행: node --env-file=.env.local supabase/seed.mjs
//
// 2단계로 나뉜다.
//   1) 정체성  — branches / teacher_spaces : upsert (멱등)
//   2) 도메인  — 학생·수업·차시·출결·성적·과제·클리닉·공지·할일
//                : 시드 대상 공간의 기존 행을 지우고 다시 넣는다.
//                  데모 데이터라 이게 안전하고, 재실행 결과가 항상 같다.
//
// 난수는 쓰지 않는다. 문자열 해시 기반 결정적 생성이라 몇 번을 돌려도 같은 화면이 나온다.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const die = (label) => (r) => {
  if (r.error) { console.error(`[${label}]`, r.error.message); process.exit(1); }
  return r.data;
};

/* ── 결정적 의사난수 ───────────────────────────── */
// mulberry32 — 앞서 쓰던 LCG(mod 100000)는 하위 자릿수가 {0,5} 만 오가서
// rnd(0,9) 같은 좁은 범위를 뽑으면 값이 두 개로 고정된다. 실제로 '지각/미제출이
// 하나도 없는' 시드가 나왔었다. 결정성은 유지하면서 분포만 제대로 만든다.
function seeded(s) {
  let a = 0;
  for (const c of String(s)) a = (a + c.charCodeAt(0) * 2654435761) >>> 0;
  return (min, max) => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return min + Math.floor(r * (max - min + 1));
  };
}
const pick = (rnd, arr) => arr[rnd(0, arr.length - 1)];

/* ── 1) 정체성 ─────────────────────────────────── */

const BRANCHES = ["대치", "반포", "방배", "송도"];
// accent_color: TDS 톤 + 흰 글자 대비 4.5:1 이상 (마이그레이션 …_tds_accent_colors 참고)
const SPACES = [
  { name: "김쌤", subject: "수학", slug: "kim-math", accent_color: "#1b64da", sort_order: 1 },
  { name: "박쌤", subject: "수학", slug: "park-math", accent_color: "#07835a", sort_order: 2 },
  { name: "글로리아", subject: "영어", slug: "gloria-eng", accent_color: "#6b4ce0", sort_order: 3 },
  { name: "손쌤", subject: "국어", slug: "son-kor", accent_color: "#c2410c", sort_order: 4 },
  { name: "백신", subject: "화학", slug: "baek-chem", accent_color: "#12808f", sort_order: 5 },
  { name: "꽉처스", subject: "수학", slug: "quakchers-math", accent_color: "#d81b60", sort_order: 6 },
];

die("branches")(await db.from("branches").upsert(BRANCHES.map((name) => ({ name })), { onConflict: "name" }));

const daechi = die("branch 대치")(
  await db.from("branches").select("id").eq("name", "대치").single(),
);

die("teacher_spaces")(
  await db.from("teacher_spaces")
    .upsert(SPACES.map((s) => ({ ...s, branch_id: daechi.id })), { onConflict: "slug" }),
);

const spaces = die("spaces select")(
  await db.from("teacher_spaces").select("id, name, subject, slug").in("slug", SPACES.map((s) => s.slug)),
);

// 공간마다 설정 행 하나 (기본값은 코드에, 여기엔 override 만 쌓인다)
die("space_settings")(
  await db.from("space_settings")
    .upsert(spaces.map((s) => ({ space_id: s.id, settings: {} })), { onConflict: "space_id" }),
);

/* ── 2) 학생 명부 (지점 소속 — 쌤이 바뀌어도 남는다) ── */

const ROSTER = [
  ["김도윤", "대치중", "중3"], ["이서준", "휘문고", "고1"], ["박하은", "숙명여중", "중2"],
  ["최지우", "경기고", "고2"], ["정예진", "단대부고", "고1"], ["강하람", "대명중", "중3"],
  ["윤채원", "중동고", "고2"], ["한지호", "역삼중", "중2"], ["서지안", "숙명여고", "고1"],
  ["오하준", "대청중", "중3"], ["임서윤", "은광여고", "고2"], ["배준서", "개포고", "고1"],
  ["신아린", "대명중", "중2"], ["문태윤", "휘문고", "고2"], ["조유나", "진선여고", "고1"],
  ["황시우", "구정고", "고2"], ["남지호", "대치중", "중3"], ["곽예린", "역삼중", "중2"],
  ["표승현", "중대부고", "고1"], ["류하윤", "경기여고", "고2"], ["채민준", "언주중", "중3"],
  ["양서아", "숙명여중", "중2"], ["도현우", "청담고", "고1"], ["석지민", "단대부고", "고2"],
];

const existing = die("students select")(
  await db.from("students").select("id, name").eq("branch_id", daechi.id),
);
const byName = new Map(existing.map((s) => [s.name, s.id]));

const missing = ROSTER.filter(([name]) => !byName.has(name)).map(([name, school, grade], i) => ({
  branch_id: daechi.id,
  name,
  school,
  grade,
  phone: `010-${String(2000 + i * 137).slice(0, 4)}-${String(1000 + i * 391).slice(0, 4)}`,
  status: name === "강하람" ? "inactive" : "active",
}));
if (missing.length) {
  const added = die("students insert")(await db.from("students").insert(missing).select("id, name"));
  added.forEach((s) => byName.set(s.name, s.id));
}
const students = ROSTER.map(([name]) => ({ id: byName.get(name), name }));

/* ── 2-b) 학부모 ─────────────────────────────────
   학부모 앱은 parent_links 를 타고 자녀를 찾는다. 링크가 없으면
   화면이 '자녀 없음'으로 떨어지므로 명부 앞 12명에 보호자를 붙인다. */

const parentOf = ROSTER.slice(0, 12).map(([name]) => `${name} 학부모`);
const existingParents = die("parents select")(
  await db.from("parents").select("id, name").in("name", parentOf),
);
const parentByName = new Map(existingParents.map((p) => [p.name, p.id]));
const newParents = parentOf
  .filter((n) => !parentByName.has(n))
  .map((n, i) => ({ name: n, phone: `010-${String(7000 + i * 173).slice(0, 4)}-${String(2000 + i * 311).slice(0, 4)}` }));
if (newParents.length) {
  const added = die("parents insert")(await db.from("parents").insert(newParents).select("id, name"));
  added.forEach((p) => parentByName.set(p.name, p.id));
}
die("parent_links")(
  await db.from("parent_links").upsert(
    ROSTER.slice(0, 12).map(([name]) => ({
      parent_id: parentByName.get(`${name} 학부모`),
      student_id: byName.get(name),
      relation: "모",
    })),
    { onConflict: "parent_id,student_id" },
  ),
);

/* ── 3) 도메인 데이터 (공간별로 지우고 다시) ────── */

const spaceIds = spaces.map((s) => s.id);
// 자식이 먼저 (FK 순서). space_id 가 있는 테이블만 범위 삭제하고,
// 그렇지 않은 테이블은 전체 삭제로 멱등성을 맞춘다.
for (const t of [
  "magic_links",
  "clinic_reservations",
  "clinic_sessions",
  "todos",
  "retakes",
  "student_memos",
  "attendance",
  "clinics",
  "notices",
  "assignments",
  "exams",
  "sessions",
  "classes",
  "enrollments",
]) {
  die(`wipe ${t}`)(await db.from(t).delete().in("space_id", spaceIds));
}
for (const t of ["exam_answers", "exam_questions"]) {
  const rows = die(`wipe ${t} ids`)(await db.from(t).select("id"));
  if (rows.length) {
    die(`wipe ${t}`)(await db.from(t).delete().in("id", rows.map((r) => r.id)));
  }
}

const SUBJECT_EXAMS = {
  수학: ["개념테스트", "계산연습", "모의고사"],
  영어: ["단어시험", "문법", "독해"],
  국어: ["문학", "문법", "독서"],
  화학: ["개념", "계산", "실전"],
};
const PROGRESS = {
  수학: ["미분계수와 도함수", "극한", "수열의 극한", "적분", "삼각함수", "지수로그", "확률", "통계"],
  영어: ["관계대명사", "분사구문", "가정법", "독해 추론", "빈칸추론", "어법", "어휘", "듣기"],
  국어: ["현대시", "고전시가", "독서-과학", "문법-음운", "소설", "수필", "화법", "작문"],
  화학: ["산화환원", "화학평형", "산염기", "반응속도", "몰농도", "전기화학", "결합", "주기율"],
};
const ATT = ["present", "present", "present", "present", "video", "late", "absent", "present"];

// 토요일 8회차 — 지난 6회 + 다가올 2회 (오래된 것 → 최근)
const NOW = new Date();
const SAT = (() => {
  const d = new Date();
  d.setUTCHours(9, 0, 0, 0);                                // KST 18:00
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7)); // 직전 토요일
  return Array.from({ length: 8 }, (_, i) => {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() + (i - 5) * 7);
    return x;
  });
})();
const isPast = (i) => SAT[i].getTime() < NOW.getTime();
const ymd = (d) => d.toISOString().slice(0, 10);

let stats = {
  classes: 0,
  sessions: 0,
  exams: 0,
  questions: 0,
  answers: 0,
  results: 0,
  subs: 0,
  att: 0,
  todos: 0,
  retakes: 0,
  clinicReservations: 0,
};

for (const [si, space] of spaces.entries()) {
  const subject = space.subject ?? "정규";
  const examNames = SUBJECT_EXAMS[subject] ?? ["시험A", "시험B", "숙제완성도"];
  const topics = PROGRESS[subject] ?? Array(8).fill("핵심 개념 정리");

  // 공간마다 다른 8명이 걸리도록 명부를 회전시킨다 (한 학생이 여러 쌤을 듣는 상황 재현)
  const roster = Array.from({ length: 8 }, (_, i) => students[(si * 3 + i) % students.length]);

  die("enrollments")(
    await db.from("enrollments").insert(
      roster.map((s) => ({ student_id: s.id, space_id: space.id, status: "active" })),
    ),
  );

  const classes = die("classes")(
    await db.from("classes").insert([
      { space_id: space.id, title: `${subject} 정규 A반`, description: "세정학원 대치 3층 A강의실" },
      { space_id: space.id, title: `${subject} 정규 B반`, description: "세정학원 대치 3층 B강의실" },
    ]).select("id, title"),
  );
  stats.classes += classes.length;

  const sessionRows = [];
  for (const [ci, cls] of classes.entries()) {
    const shiftH = ci === 0 ? 0 : -4;   // A반 18:00 / B반 14:00
    for (let n = 0; n < 8; n++) {
      sessionRows.push({
        class_id: cls.id,
        space_id: space.id,
        session_no: n + 1,
        title: `${n + 1}회차 · ${topics[n]}`,
        scheduled_at: new Date(SAT[n].getTime() + shiftH * 3600e3).toISOString(),
        concept_tags: [topics[n]],
      });
    }
  }
  const sessions = die("sessions")(await db.from("sessions").insert(sessionRows).select("id, class_id, session_no"));
  stats.sessions += sessions.length;

  // A반 차시만 성적/과제/출결을 채운다 (B반은 빈 상태로 두어 '아직 안 한 반'을 재현)
  const aClassId = classes[0].id;
  const aSessions = sessions.filter((s) => s.class_id === aClassId).sort((a, b) => a.session_no - b.session_no);

  // 출결
  const attRows = [];
  for (const sess of aSessions) {
    for (const st of roster) {
      const rnd = seeded(`${space.slug}${st.name}${sess.session_no}att`);
      attRows.push({
        space_id: space.id,
        session_id: sess.id,
        student_id: st.id,
        status: isPast(sess.session_no - 1) ? pick(rnd, ATT) : "undecided",
        marked_at: isPast(sess.session_no - 1) ? SAT[sess.session_no - 1].toISOString() : null,
      });
    }
  }
  die("attendance")(await db.from("attendance").insert(attRows));
  stats.att += attRows.length;

  // 시험 — 차시마다 첫 번째 시험 유형 1개 + 마지막 3차시에 모의고사
  const examRows = aSessions.map((sess) => ({
    space_id: space.id,
    session_id: sess.id,
    title: `${sess.session_no}회차 ${examNames[sess.session_no % examNames.length]}`,
    exam_type: examNames[sess.session_no % examNames.length],
    max_score: 30,
    cutoff_score: 21,
    score_status: isPast(sess.session_no - 1) ? "open" : "closed",
    exam_date: ymd(SAT[sess.session_no - 1]),
  }));
  const exams = die("exams")(await db.from("exams").insert(examRows).select("id, title, exam_date"));
  stats.exams += exams.length;

  const questionRows = exams.flatMap((ex) =>
    Array.from({ length: 10 }, (_, i) => ({
      exam_id: ex.id,
      question_no: i + 1,
      points: 3,
      correct_answers: [String((i % 5) + 1)],
      choices: ["1", "2", "3", "4", "5"],
      concept_tags: [topics[Math.min(i, topics.length - 1)]],
    })),
  );
  const questions = die("exam_questions")(
    await db.from("exam_questions").insert(questionRows).select("id, exam_id, question_no"),
  );
  stats.questions += questions.length;
  const questionsByExam = new Map();
  for (const q of questions) {
    const arr = questionsByExam.get(q.exam_id) ?? [];
    arr.push(q);
    questionsByExam.set(q.exam_id, arr);
  }

  const resultRows = [];
  const answerRows = [];
  exams.forEach((ex, i) => {
    // 아직 안 치른 차시는 채점 결과가 없다
    if (!isPast(i)) return;
    for (const st of roster) {
      const rnd = seeded(`${space.slug}${st.name}${ex.id}score`);
      const score = rnd(14, 30);
      resultRows.push({
        exam_id: ex.id,
        student_id: st.id,
        score,
        graded_at: new Date(SAT[i].getTime() + 864e5).toISOString(),
      });

      const correctCount = Math.max(0, Math.min(10, Math.round(score / 3)));
      for (const q of questionsByExam.get(ex.id) ?? []) {
        const correct = q.question_no <= correctCount;
        answerRows.push({
          exam_id: ex.id,
          question_id: q.id,
          student_id: st.id,
          answer: correct ? String(((q.question_no - 1) % 5) + 1) : String((q.question_no % 5) + 1),
          is_correct: correct,
          earned_points: correct ? 3 : 0,
          graded_at: new Date(SAT[i].getTime() + 864e5).toISOString(),
        });
      }
    }
  });
  die("exam_results")(await db.from("exam_results").insert(resultRows));
  die("exam_answers")(await db.from("exam_answers").insert(answerRows));
  stats.results += resultRows.length;
  stats.answers += answerRows.length;

  // 과제
  const asgRows = aSessions.map((sess) => ({
    space_id: space.id,
    session_id: sess.id,
    title: `${subject} ${sess.session_no}회차 과제`,
    description: sess.session_no % 2 ? "오답노트 + 미니 모의고사" : "문제집 p.120~135",
    due_date: ymd(new Date(SAT[sess.session_no - 1].getTime() + 6 * 864e5)),
  }));
  const asgs = die("assignments")(await db.from("assignments").insert(asgRows).select("id"));

  const subRows = [];
  asgs.forEach((a, i) => {
    for (const st of roster) {
      const rnd = seeded(`${space.slug}${st.name}${a.id}sub`);
      const r = rnd(0, 9);
      const status = !isPast(i) ? "pending" : r < 7 ? "submitted" : r < 9 ? "late" : "pending";
      subRows.push({
        assignment_id: a.id,
        student_id: st.id,
        status,
        submitted_at: status === "pending" ? null : new Date(SAT[i].getTime() + rnd(1, 5) * 864e5).toISOString(),
      });
    }
  });
  die("submissions")(await db.from("submissions").insert(subRows));
  stats.subs += subRows.length;

  // 구형 클리닉 테이블: 기존 화면 호환용
  die("clinics")(
    await db.from("clinics").insert([
      { space_id: space.id, student_id: roster[4].id, reason: `${topics[6]} 보강`, status: "requested" },
      { space_id: space.id, student_id: roster[5].id, reason: "모의고사 오답 클리닉", status: "approved",
        scheduled_at: new Date(SAT[7].getTime() + 3 * 864e5).toISOString() },
      { space_id: space.id, student_id: roster[6].id, reason: "결석 보강", status: "done",
        scheduled_at: new Date(SAT[6].getTime() + 2 * 864e5).toISOString() },
    ]),
  );

  // M1 클리닉 세션/예약
  const clinicSessions = die("clinic_sessions")(
    await db.from("clinic_sessions").insert([
      {
        space_id: space.id,
        class_id: aClassId,
        title: `${subject} 재시험 클리닉`,
        location: "세정학원 대치 2층 클리닉룸",
        starts_at: new Date(SAT[7].getTime() + 2 * 864e5).toISOString(),
        ends_at: new Date(SAT[7].getTime() + 2 * 864e5 + 2 * 3600e3).toISOString(),
        capacity: 8,
      },
      {
        space_id: space.id,
        class_id: aClassId,
        title: `${subject} 오답 클리닉`,
        location: "세정학원 대치 2층 클리닉룸",
        starts_at: new Date(SAT[7].getTime() + 4 * 864e5).toISOString(),
        ends_at: new Date(SAT[7].getTime() + 4 * 864e5 + 2 * 3600e3).toISOString(),
        capacity: 8,
      },
    ]).select("id, title, starts_at"),
  );

  const retakes = die("retakes select")(
    await db.from("retakes").select("id, student_id").eq("space_id", space.id).limit(6),
  );
  stats.retakes += retakes.length;

  const uniqueRetakes = [];
  const seenRetakeStudents = new Set();
  for (const r of retakes) {
    if (seenRetakeStudents.has(r.student_id)) continue;
    seenRetakeStudents.add(r.student_id);
    uniqueRetakes.push(r);
  }

  const reservationRows = uniqueRetakes.slice(0, 4).map((r, i) => ({
    space_id: space.id,
    clinic_session_id: clinicSessions[i % clinicSessions.length].id,
    student_id: r.student_id,
    retake_id: r.id,
    status: i === 0 ? "reserved" : i === 1 ? "arrived" : i === 2 ? "departed" : "no_show",
    arrived_at: i >= 1 && i <= 2 ? new Date(SAT[7].getTime() + 2 * 864e5 + 10 * 60e3).toISOString() : null,
    departed_at: i === 2 ? new Date(SAT[7].getTime() + 2 * 864e5 + 90 * 60e3).toISOString() : null,
    feedback: i === 2 ? "오답 정리 완료, 같은 유형 5문항 추가 풀이 필요" : null,
  }));
  const reservations = reservationRows.length
    ? die("clinic_reservations")(await db.from("clinic_reservations").insert(reservationRows).select("id, student_id"))
    : [];
  stats.clinicReservations += reservations.length;

  if (reservations.length) {
    die("magic_links")(
      await db.from("magic_links").insert(
        reservations.flatMap((r, i) => [
          {
            token: `${space.slug}-clinic-arrived-${i + 1}`,
            space_id: space.id,
            action: "clinic_arrived",
            student_id: r.student_id,
            target_id: r.id,
            expires_at: new Date(SAT[7].getTime() + 14 * 864e5).toISOString(),
          },
          {
            token: `${space.slug}-clinic-departed-${i + 1}`,
            space_id: space.id,
            action: "clinic_departed",
            student_id: r.student_id,
            target_id: r.id,
            expires_at: new Date(SAT[7].getTime() + 14 * 864e5).toISOString(),
          },
        ]),
      ),
    );
  }

  // 공지
  die("notices")(
    await db.from("notices").insert([
      { space_id: space.id, title: `이번 주 숙제 제출 안내`,
        body: "토요일 수업 전까지 오답노트와 미니 모의고사를 제출해 주세요.", audience: "all" },
      { space_id: space.id, title: `8회차 ${examNames[0]} 범위 공지`,
        body: `${topics[7]} 전 범위입니다.`, audience: "students" },
      { space_id: space.id, title: "8월 클리닉 신청 오픈",
        body: "매주 화·목 19시 클리닉 예약을 받습니다.", audience: "parents" },
    ]),
  );

  const todos = die("todos select")(
    await db.from("todos").select("id").eq("space_id", space.id),
  );
  stats.todos += todos.length;
}

console.log(
  `seed OK — branches ${BRANCHES.length} / spaces ${spaces.length} / students ${students.length}\n` +
  `  classes ${stats.classes} · sessions ${stats.sessions} · attendance ${stats.att}\n` +
  `  exams ${stats.exams} · questions ${stats.questions} · answers ${stats.answers} · results ${stats.results}\n` +
  `  submissions ${stats.subs} · todos ${stats.todos} · retakes ${stats.retakes} · clinic reservations ${stats.clinicReservations}`,
);
