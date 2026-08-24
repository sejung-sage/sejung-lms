import { createAdminClient } from "@/lib/supabase/admin";
import { mockParentHome, type ParentHome } from "@/lib/mock/parent";
import type { SpaceDetail } from "@/lib/spaces";

/**
 * 학부모 앱 데이터 seam (읽기 전용).
 *
 * ⚠ 학생앱과 같은 이유로 아직 "누구의 학부모인가"를 세션에서 못 가져온다.
 *   이 공간에 자녀가 등록된 보호자 중 첫 명을 골라 보여준다.
 *
 * 성장 기록/알림은 상담일지 테이블이 아직 없다(PRD M2). 문장을 지어내는 대신
 * 실제 점수·제출·출결 변화에서 사실만 뽑아 만든다.
 */
const useMock = process.env.USE_MOCK_DB === "true";

const ATT_LABEL: Record<string, string> = {
  present: "출석 완료", video: "영상 수강", late: "지각", early_leave: "조퇴",
  absent: "결석", withdrawn: "퇴원", none: "부재", undecided: "미정",
};

export async function getParentHome(space: SpaceDetail): Promise<ParentHome | null> {
  if (useMock) return mockParentHome(space);
  if (!space.id) return null;

  const db = createAdminClient();

  // 이 공간의 수강생 → 그 학생들의 보호자
  const { data: enr } = await db
    .from("enrollments").select("students!inner(id, name)")
    .eq("space_id", space.id).eq("status", "active");

  type S = { id: string; name: string };
  const enrolled: S[] = (enr ?? []).flatMap((r: { students: S | S[] }) =>
    Array.isArray(r.students) ? r.students : [r.students],
  );
  if (!enrolled.length) return null;

  const { data: links } = await db
    .from("parent_links").select("parent_id, student_id")
    .in("student_id", enrolled.map((s) => s.id));

  if (!links?.length) return null;
  const parentId = [...links].sort((a, b) => a.parent_id.localeCompare(b.parent_id))[0].parent_id;
  const myKids = links.filter((l) => l.parent_id === parentId).map((l) => l.student_id);
  const children = enrolled.filter((s) => myKids.includes(s.id));
  if (!children.length) return null;

  const child = children[0];

  const [examRes, asgRes, attRes] = await Promise.all([
    db.from("exams").select("title, max_score, exam_date, exam_results(student_id, score)")
      .eq("space_id", space.id).order("exam_date", { ascending: true }),
    db.from("assignments").select("id, due_date, submissions(student_id, status)").eq("space_id", space.id),
    db.from("attendance").select("status, marked_at, sessions!inner(session_no)")
      .eq("space_id", space.id).eq("student_id", child.id)
      .order("marked_at", { ascending: false, nullsFirst: false }).limit(1),
  ]);

  type ExamRow = { title: string; max_score: number | null; exam_date: string | null; exam_results: { student_id: string; score: number | null }[] };
  const history = ((examRes.data ?? []) as ExamRow[])
    .map((e, i) => {
      const scores = (e.exam_results ?? []).filter((r) => r.score != null).map((r) => Number(r.score));
      const mine = (e.exam_results ?? []).find((r) => r.student_id === child.id);
      const max = Number(e.max_score ?? 100);
      return {
        round: i + 1, title: e.title, max,
        score: mine?.score == null ? null : Number(mine.score),
        pct: mine?.score == null ? null : Math.round((Number(mine.score) / max) * 100),
        above: mine?.score == null ? 0 : scores.filter((s) => s > Number(mine.score)).length,
        n: scores.length,
      };
    })
    .filter((e) => e.score != null);

  // 마감 전 과제는 분모에서 뺀다 (학생앱과 같은 기준)
  type AsgRow = { id: string; due_date: string | null; submissions: { student_id: string; status: string }[] };
  const todayStr = new Date().toISOString().slice(0, 10);
  const asgs = ((asgRes.data ?? []) as AsgRow[]).filter((a) => (a.due_date ?? "") <= todayStr);
  const mineSubs = asgs.map((a) => (a.submissions ?? []).find((s) => s.student_id === child.id)?.status);
  const doneN = mineSubs.filter((s) => s === "submitted" || s === "late").length;

  const latest = history[history.length - 1];
  const att = (attRes.data ?? [])[0] as { status: string } | undefined;

  /* 성장 기록 — 지어낸 코멘트 대신 실제 회차 간 변화만 적는다 */
  const growth: ParentHome["growth"] = history
    .slice(-4).reverse()
    .map((e, i, arr) => {
      const before = arr[i + 1];
      const delta = before?.pct != null && e.pct != null ? e.pct - before.pct : 0;
      const rank = e.n ? Math.max(1, Math.round((e.above / e.n) * 100)) : 0;
      return {
        date: `${e.round}회차`,
        text: delta === 0
          ? `${e.title} ${e.pct}점 · 반 상위 ${rank}%`
          : `${e.title} ${e.pct}점 (${delta > 0 ? "+" : ""}${delta}) · 반 상위 ${rank}%`,
        kind: (delta >= 0 ? "good" : "care") as "good" | "care",
      };
    })
    .slice(0, 3);

  const alerts: ParentHome["alerts"] = [];
  if (latest) alerts.push({ icon: "📊", text: `${latest.title} 성적이 등록되었습니다`, at: `${latest.round}회차` });
  const missing = asgs.length - doneN;
  if (missing > 0) alerts.push({ icon: "📝", text: `숙제 ${missing}건이 미제출 상태입니다`, at: "이번 주" });
  if (att) alerts.push({ icon: "✅", text: `최근 수업 ${ATT_LABEL[att.status] ?? att.status}`, at: "최근 차시" });

  return {
    children: children.map((c) => c.name),
    child: child.name,
    weekSummary: {
      attendance: att ? (ATT_LABEL[att.status] ?? att.status) : "기록 없음",
      homework: `${doneN}/${asgs.length} 완료`,
      test: latest ? `${latest.score} / ${latest.max}점` : "응시 없음",
    },
    examTrend: {
      labels: history.slice(-7).map((e) => `${e.round}회`),
      points: history.slice(-7).map((e) => e.pct!),
    },
    recentScore: latest
      ? { label: latest.title, score: latest.pct!, percentile: latest.n ? Math.max(1, Math.round((latest.above / latest.n) * 100)) : 0 }
      : { label: "응시 이력 없음", score: 0, percentile: 0 },
    growth,
    alerts,
  };
}

export type { ParentHome };
