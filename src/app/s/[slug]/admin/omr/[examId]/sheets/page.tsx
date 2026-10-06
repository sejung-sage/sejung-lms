import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getSpaceBySlug } from "@/lib/spaces";
import { getOmrExamDetail } from "@/lib/omr";
import {
  PAGE, FIDUCIAL, FIDUCIALS, QR_BOX, GRID, MAX_QUESTIONS, rowOf, bubbleCenter, encodeSheetQr,
} from "@/lib/omr-sheet";
import { PrintBar } from "@/components/omr/PrintBar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "OMR 답안지 인쇄", robots: { index: false, follow: false } };

/**
 * 학생별 OMR 답안지. 한 학생 = A4 한 장.
 * 모든 위치를 mm 절대좌표로 찍는다 — 인식기가 같은 좌표(omr-sheet.ts)로 읽기 때문에
 * 흐름 배치(flex/grid)를 쓰면 글꼴·브라우저에 따라 버블이 밀려서 못 읽는다.
 */

const mm = (v: number) => `${v}mm`;

export default async function OmrSheetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; examId: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const { slug, examId } = await params;
  const { student } = await searchParams;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();
  const detail = await getOmrExamDetail(space, examId);
  if (!detail) notFound();

  const { exam, questions, submissions } = detail;
  const students = student ? submissions.filter((s) => s.studentId === student) : submissions;

  const problem = !questions.length
    ? "정답을 먼저 등록해 주세요. 문항 수를 알아야 답안지를 그릴 수 있어요."
    : questions.length > MAX_QUESTIONS
      ? `답안지 한 장에 ${MAX_QUESTIONS}문항까지 들어가요. 지금 ${questions.length}문항이에요.`
      : null;

  const qrs = problem
    ? []
    : await Promise.all(
        students.map((s) =>
          QRCode.toString(encodeSheetQr(exam.id, s.studentId), { type: "svg", margin: 0, errorCorrectionLevel: "M" }),
        ),
      );

  return (
    <div className="min-h-dvh bg-grey-100 print:bg-white">
      {/* 인쇄용 여백 0 · A4 고정 */}
      <style>{`@page { size: A4; margin: 0 } @media print { .sheet { break-after: page; box-shadow: none !important; margin: 0 !important } }`}</style>

      <PrintBar
        backHref={`/s/${slug}/admin/omr/${exam.id}`}
        title={`${exam.title} · 답안지 ${problem ? 0 : students.length}장`}
        disabled={!!problem}
      />

      {problem ? (
        <p className="mx-auto mt-10 max-w-md rounded-card border border-grey-200 bg-white p-6 text-center text-[14px] text-grey-700">
          {problem}
        </p>
      ) : (
        students.map((s, si) => (
          <section
            key={s.studentId}
            className="sheet relative mx-auto my-6 overflow-hidden bg-white text-black shadow-sm"
            style={{ width: mm(PAGE.w), height: mm(PAGE.h) }}
          >
            {Object.values(FIDUCIALS).map((f, i) => (
              <div
                key={i}
                className="absolute bg-black"
                style={{ left: mm(f.x - FIDUCIAL.size / 2), top: mm(f.y - FIDUCIAL.size / 2), width: mm(FIDUCIAL.size), height: mm(FIDUCIAL.size) }}
              />
            ))}

            {/* 머리말 */}
            <div className="absolute" style={{ left: mm(24), top: mm(24), width: mm(128) }}>
              <div className="text-[11pt] text-neutral-500">{space.name} · {exam.examDate ?? ""}</div>
              <div className="mt-[1mm] text-[17pt] font-bold leading-tight">{exam.title}</div>
              <div className="mt-[4mm] flex items-baseline gap-[3mm]">
                <span className="text-[10pt] text-neutral-500">이름</span>
                <span className="text-[16pt] font-bold">{s.name}</span>
                {s.school && <span className="text-[10pt] text-neutral-500">{s.school}</span>}
              </div>
              <div className="mt-[3mm] text-[8.5pt] leading-snug text-neutral-500">
                컴퓨터용 사인펜 또는 진한 연필(B 이상)로 동그라미 안을 꽉 채워 칠하세요.
                답안지를 접거나 귀퉁이 검은 네모를 가리지 마세요.
              </div>
            </div>

            <div
              className="absolute [&>svg]:h-full [&>svg]:w-full"
              style={{ left: mm(QR_BOX.x), top: mm(QR_BOX.y), width: mm(QR_BOX.size), height: mm(QR_BOX.size) }}
              dangerouslySetInnerHTML={{ __html: qrs[si] }}
            />

            {/* 단 머리 — 선지 번호 */}
            {Array.from({ length: Math.min(GRID.columns, Math.ceil(questions.length / GRID.rowsPerColumn)) }, (_, col) =>
              questions[0].choices.map((c, ci) => {
                const b = bubbleCenter(col * GRID.rowsPerColumn, ci);
                return (
                  <div
                    key={`h-${col}-${c}`}
                    className="absolute text-center text-[8pt] text-neutral-500"
                    style={{ left: mm(b.x - 3), top: mm(b.y - GRID.rowPitch - 1.5), width: mm(6) }}
                  >
                    {c}
                  </div>
                );
              }),
            )}

            {questions.map((q, i) => {
              const r = rowOf(i);
              return (
                <div key={q.id}>
                  <div
                    className="absolute text-right text-[10pt] font-bold"
                    style={{ left: mm(r.left), top: mm(r.y - 2.2), width: mm(8) }}
                  >
                    {q.no}
                  </div>
                  {q.choices.map((c, ci) => {
                    const b = bubbleCenter(i, ci);
                    const d = GRID.bubbleDiameter;
                    return (
                      <div
                        key={c}
                        className="absolute flex items-center justify-center rounded-full border border-neutral-400 text-[6.5pt] text-neutral-300"
                        style={{ left: mm(b.x - d / 2), top: mm(b.y - d / 2), width: mm(d), height: mm(d) }}
                      >
                        {c}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="absolute text-[7pt] text-neutral-400" style={{ left: mm(24), top: mm(287) }}>
              세정 LMS OMR · 이 답안지는 {s.name} 학생 전용입니다
            </div>
          </section>
        ))
      )}
    </div>
  );
}
