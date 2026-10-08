import Link from "next/link";
import { Card, Badge, type Tone } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cardBase } from "@/components/admin/ui";
import { setOmrOpen } from "@/lib/omr-actions";
import { isCorrect } from "@/lib/omr-grade";
import type { OmrExamListRow, OmrExamMeta, OmrQuestion, OmrSubmission } from "@/lib/omr";
import { CreateExamForm } from "./CreateExamForm";

/* 관리자 OMR 화면의 서버 컴포넌트들. 입력 폼만 클라이언트로 뺐다. */

function examState(e: { omrOpen: boolean; questionCount: number }): { label: string; tone: Tone } {
  if (!e.questionCount) return { label: "정답 미등록", tone: "amber" };
  if (e.omrOpen) return { label: "학생 제출 받는 중", tone: "blue" };
  return { label: "학생 제출 닫힘", tone: "grey" };
}

const th = "whitespace-nowrap px-3 py-2.5 text-left text-[12.5px] font-semibold text-grey-600";
const td = "h-11 px-3 text-[13.5px]";

/* ── 목록 ───────────────────────────────────── */

export function OmrExamList({ slug, classId, rows, today }: { slug: string; classId: string; rows: OmrExamListRow[]; today: string }) {
  return (
    <>
      <Card>
        <div className="mb-3 text-[15px] font-bold text-grey-900">새 시험</div>
        <CreateExamForm slug={slug} classId={classId} today={today} />
      </Card>

      <div className={`${cardBase} overflow-hidden`}>
        <div className="flex items-center gap-2 border-b border-grey-200 px-4 py-3">
          <span className="text-[15px] font-bold text-grey-900">시험</span>
          <span className="text-[13px] text-grey-500">· 눌러서 정답 입력·대리 입력</span>
        </div>
        {!rows.length ? (
          <div className="py-16 text-center text-[13.5px] text-grey-400">아직 시험이 없어요. 위에서 만들어 주세요.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-grey-100">
                <tr>
                  <th className={th}>시험</th><th className={th}>시험일</th>
                  <th className={`${th} text-right`}>문항</th><th className={`${th} text-right`}>입력</th>
                  <th className={`${th} text-right`}>상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-100">
                {rows.map((e) => {
                  const st = examState(e);
                  return (
                    <tr key={e.id} className="transition-colors hover:bg-grey-50">
                      <td className={td}>
                        <Link href={`/s/${slug}/admin/omr/${e.id}`} className="font-semibold text-grey-900 hover:text-blue-600">
                          {e.title}
                        </Link>
                      </td>
                      <td className={`${td} num text-grey-600`}>{e.examDate ?? "—"}</td>
                      <td className={`${td} num text-right text-grey-700`}>{e.questionCount || "—"}</td>
                      <td className={`${td} num text-right text-grey-700`}>{e.submitted}/{e.roster}</td>
                      <td className={`${td} text-right`}><Badge tone={st.tone}>{st.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ── 학생 제출 열기/닫기 ──────────────────────── */

export function OmrOpenToggle({ slug, exam, questionCount }: { slug: string; exam: OmrExamMeta; questionCount: number }) {
  const next = !exam.omrOpen;
  return (
    <form action={setOmrOpen.bind(null, slug, exam.id, next)}>
      <Button
        type="submit" size="sm" variant={exam.omrOpen ? "secondary" : "weak"}
        disabled={next && !questionCount}
        title={next && !questionCount ? "정답을 먼저 등록해 주세요" : undefined}
      >
        {exam.omrOpen ? "학생 제출 닫기" : "학생 제출 열기"}
      </Button>
    </form>
  );
}

/* ── 상단 요약 ──────────────────────────────── */

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={`${cardBase} p-4`}>
      <div className="text-[13px] font-medium text-grey-600">{label}</div>
      <div className="num mt-1 text-[22px] font-bold tracking-[-0.03em] text-grey-900">{value}</div>
    </div>
  );
}

export function OmrSummary({
  exam, questions, submissions,
}: { exam: OmrExamMeta; questions: OmrQuestion[]; submissions: OmrSubmission[] }) {
  const done = submissions.filter((s) => s.score != null).length;
  const st = examState({ omrOpen: exam.omrOpen, questionCount: questions.length });
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={st.tone}>{st.label}</Badge>
        <span className="text-[13px] text-grey-500">
          {exam.examDate ?? "시험일 미정"}
          {exam.cutoff != null ? ` · 커트라인 ${exam.cutoff}점` : ""}
          {" · "}성적 {exam.scoreOpen ? "공개" : "비공개"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="문항" value={questions.length || "—"} />
        <Tile label="만점" value={exam.maxScore ?? "—"} />
        <Tile label="입력" value={`${done}/${submissions.length}`} />
        <Tile label="평균" value={exam.stats.count ? exam.stats.avg : "—"} />
        <Tile label="표준편차" value={exam.stats.count ? exam.stats.stddev : "—"} />
      </div>
    </>
  );
}

/* ── 학생별 제출 현황 ─────────────────────────── */

const SOURCE: Record<NonNullable<OmrSubmission["source"]>, string> = {
  student: "학생 제출",
  staff: "조교 입력",
  scan: "스캔",
  import: "기존 점수",
};

const at = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ko-KR", {
        month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul",
      })
    : "—";

export function OmrSubmissionTable({
  questions, submissions, cutoff,
}: { questions: OmrQuestion[]; submissions: OmrSubmission[]; cutoff: number | null }) {
  return (
    <div className={`${cardBase} overflow-hidden`}>
      <div className="flex items-center gap-2 border-b border-grey-200 px-4 py-3">
        <span className="text-[15px] font-bold text-grey-900">학생별 답안</span>
        <span className="text-[13px] text-grey-500">· 빨간 칸이 오답</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-grey-100">
            <tr>
              <th className={th}>이름</th><th className={th}>경로</th><th className={th}>시각</th>
              <th className={th}>답안</th><th className={`${th} text-right`}>점수</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-100">
            {submissions.map((s) => (
              <tr key={s.studentId} className="transition-colors hover:bg-grey-50">
                <td className={`${td} font-semibold text-grey-900`}>{s.name}</td>
                <td className={`${td} text-grey-600`}>{s.source ? SOURCE[s.source] : <span className="text-grey-400">미입력</span>}</td>
                <td className={`${td} num text-grey-600`}>{s.score == null ? "—" : at(s.submittedAt)}</td>
                <td className={td}>
                  {s.marks ? (
                    <div className="flex flex-wrap gap-0.5 font-mono text-[12px]">
                      {questions.map((q, i) => {
                        const m = s.marks![i] ?? null;
                        return (
                          <span
                            key={q.id}
                            title={`${q.no}번`}
                            className={`inline-flex w-[18px] justify-center rounded-[3px] ${
                              isCorrect(q, m) ? "bg-grey-50 text-grey-600" : "bg-red-50 font-bold text-red-500"
                            }`}
                          >
                            {m ?? "–"}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-grey-400">—</span>
                  )}
                </td>
                <td className={`${td} text-right`}>
                  {s.score == null ? (
                    <span className="text-grey-400">—</span>
                  ) : (
                    <span className={`num font-bold ${cutoff != null && s.score < cutoff ? "text-red-500" : "text-grey-900"}`}>
                      {s.score}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
