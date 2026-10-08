import { createAdminClient } from "@/lib/supabase/admin";
import { mockDashboard, type Dashboard } from "@/lib/mock/dashboard";
import type { SpaceDetail } from "@/lib/spaces";

/**
 * TD 대시보드 데이터 seam.
 * USE_MOCK_DB=true → 목. 아니면 실 DB 집계.
 *
 * 지금은 service_role 로 읽는다. 인증이 붙으면 RLS 클라이언트로 바꾸고
 * space_id 필터는 정책이 대신하게 한다 (여기 필터는 그대로 둬도 무해하다).
 */
const useMock = process.env.USE_MOCK_DB === "true";

const EMPTY: Dashboard = {
  studentCount: 0,
  sessionsLabel: "오늘",
  todaySessions: [],
  missingHomework: [],
  gradeSummary: [],
  clinics: [],
  notices: [],
  approvals: [],
};

const HOUR = 3600_000;
const md = (iso: string) => iso.slice(5, 10).replace("-", "-");

/** 수업 3시간짜리로 보고 지금 시각과 비교 */
function sessionStatus(at: Date, now: Date): "예정" | "진행중" | "완료" {
  const diff = now.getTime() - at.getTime();
  if (diff < 0) return "예정";
  if (diff < 3 * HOUR) return "진행중";
  return "완료";
}

const CLINIC_LABEL: Record<string, "신청" | "승인" | "완료"> = {
  requested: "신청",
  approved: "승인",
  done: "완료",
};

/** classId 를 주면 그 강좌만 — 강좌 화면의 '수업 홈' */
export async function getDashboard(space: SpaceDetail, classId?: string): Promise<Dashboard> {
  if (useMock) return mockDashboard(space);
  if (!space.id) return EMPTY;

  const db = createAdminClient();
  const now = new Date();

  let sessQ = db.from("sessions").select("session_no, title, scheduled_at, classes(title)").eq("space_id", space.id);
  if (classId) sessQ = sessQ.eq("class_id", classId);
  let missQ = db.from("submissions")
    .select("status, assignments!inner(title, due_date, space_id, class_id), students!inner(name)")
    .eq("assignments.space_id", space.id);
  if (classId) missQ = missQ.eq("assignments.class_id", classId);
  let examQ = db.from("exams").select("id, exam_type, max_score, exam_results(score)").eq("space_id", space.id);
  if (classId) examQ = examQ.eq("class_id", classId);

  const [enrollRes, sessionRes, missingRes, examRes, clinicRes, noticeRes] = await Promise.all([
    classId
      ? db.from("class_members").select("*", { count: "exact", head: true }).eq("class_id", classId)
      : db.from("enrollments").select("*", { count: "exact", head: true }).eq("space_id", space.id).eq("status", "active"),
    sessQ.order("scheduled_at", { ascending: true }),
    missQ.in("status", ["pending", "late"]).limit(200),
    examQ,
    db.from("clinics").select("reason, status, students!inner(name)")
      .eq("space_id", space.id).neq("status", "canceled")
      .order("requested_at", { ascending: false }).limit(6),

    db.from("notices").select("title, created_at")
      .eq("space_id", space.id).order("created_at", { ascending: false }).limit(5),
  ]);

  /* ── 수업 ──
     시드가 전부 토요일에 있어서 '오늘'로 자르면 대부분 빈 화면이 된다.
     그래서 지금과 가장 가까운 수업일 하루를 골라 그 날짜를 라벨로 같이 넘긴다.
     (화면에 '오늘'이라고 써놓고 다른 날 데이터를 보여주지 않기 위해) */
  type SessRow = { session_no: number | null; title: string | null; scheduled_at: string | null; classes: { title: string } | { title: string }[] | null };
  const sessions = ((sessionRes.data ?? []) as SessRow[]).filter((s) => s.scheduled_at);

  let sessionsLabel = "오늘";
  let todaySessions: Dashboard["todaySessions"] = [];

  if (sessions.length) {
    const target =
      sessions.find((s) => new Date(s.scheduled_at!).getTime() >= now.getTime() - 3 * HOUR) ??
      sessions[sessions.length - 1];
    const day = target.scheduled_at!.slice(0, 10);
    const isToday = day === now.toISOString().slice(0, 10);
    sessionsLabel = isToday ? "오늘" : `${md(day)}`;

    todaySessions = sessions
      .filter((s) => s.scheduled_at!.slice(0, 10) === day)
      .map((s) => {
        const at = new Date(s.scheduled_at!);
        const cls = Array.isArray(s.classes) ? s.classes[0] : s.classes;
        return {
          time: at.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }),
          title: cls?.title ?? s.title ?? `${s.session_no}회차`,
          status: sessionStatus(at, now),
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  /* ── 숙제 미제출 ── */
  type SubRow = { status: string; assignments: { title: string; due_date: string | null } | { title: string; due_date: string | null }[] | null; students: { name: string } | { name: string }[] | null };
  const missingHomework = ((missingRes.data ?? []) as SubRow[])
    .map((r) => {
      const a = Array.isArray(r.assignments) ? r.assignments[0] : r.assignments;
      const st = Array.isArray(r.students) ? r.students[0] : r.students;
      const due = a?.due_date ? new Date(a.due_date) : null;
      const daysLate = due ? Math.floor((now.getTime() - due.getTime()) / 864e5) : 0;
      return { student: st?.name ?? "—", assignment: a?.title ?? "—", daysLate };
    })
    .filter((h) => h.daysLate > 0)
    .sort((a, b) => b.daysLate - a.daysLate)
    .slice(0, 6);

  /* ── 성적 요약 : 시험 유형별 반 평균 ── */
  type ExamRow = { exam_type: string | null; max_score: number | null; exam_results: { score: number | null }[] };
  const buckets = new Map<string, { sum: number; n: number; max: number }>();
  for (const e of (examRes.data ?? []) as ExamRow[]) {
    const key = e.exam_type ?? "기타";
    const b = buckets.get(key) ?? { sum: 0, n: 0, max: e.max_score ?? 100 };
    for (const r of e.exam_results ?? []) {
      if (r.score == null) continue;
      b.sum += Number(r.score);
      b.n += 1;
    }
    buckets.set(key, b);
  }
  const gradeSummary: Dashboard["gradeSummary"] = [...buckets.entries()]
    .filter(([, b]) => b.n > 0)
    .slice(0, 3)
    .map(([label, b]) => ({
      // 만점이 제각각이라 100점 환산해서 나란히 놓는다
      label,
      value: Math.round((b.sum / b.n / (b.max || 100)) * 100),
      unit: "%" as const,
    }));

  /* ── 클리닉 ── */
  type ClinicRow = { reason: string | null; status: string; students: { name: string } | { name: string }[] | null };
  const clinics = ((clinicRes.data ?? []) as ClinicRow[])
    .map((c) => {
      const st = Array.isArray(c.students) ? c.students[0] : c.students;
      return { student: st?.name ?? "—", reason: c.reason ?? "—", status: CLINIC_LABEL[c.status] ?? "신청" };
    });

  return {
    studentCount: enrollRes.count ?? 0,
    sessionsLabel,
    todaySessions,
    missingHomework,
    gradeSummary,
    clinics,
    notices: (noticeRes.data ?? []).map((n) => ({ title: n.title, date: md(n.created_at) })),
    // 승인 큐는 아직 테이블이 없다. 없는 걸 지어내지 않고 빈 배열로 둔다. (PRD M2)
    approvals: [],
  };
}

export type { Dashboard };
