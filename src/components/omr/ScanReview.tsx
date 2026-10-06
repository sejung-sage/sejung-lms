"use client";

import { useState, useTransition } from "react";
import { scanSheet, type MarkFlag, type ScanResult } from "@/lib/omr-scan";
import { saveScannedSheets, type ActionState } from "@/lib/omr-actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Message } from "./fields";

/**
 * 종이 OMR 스캔 업로드 → 브라우저에서 인식 → 사람이 검수 → 확정 저장.
 *
 * 인식을 서버가 아니라 여기서 하는 이유: 우리 답안지는 마커·QR 위치가 고정이라
 * 무거운 영상처리 라이브러리 없이도 읽힌다. 서버를 따로 두지 않아도 되고,
 * 스캔 원본(개인정보가 담긴 이미지)이 서버로 올라가지도 않는다.
 */

type Question = { no: number; choices: string[] };
type Student = { id: string; name: string; hasScore: boolean };

type Item = {
  key: string;
  label: string;
  thumb: string;
  error: string | null;
  studentId: string | null;
  marks: (string | null)[];
  flags: MarkFlag[];
};

/** 인식에 쓰는 해상도 — 200dpi A4 폭. 이보다 크면 느리기만 하고 정확도는 그대로다 */
const TARGET_WIDTH = 1700;

async function pdfPages(file: File): Promise<HTMLCanvasElement[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const out: HTMLCanvasElement[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: TARGET_WIDTH / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvas, viewport }).promise;
    out.push(canvas);
  }
  return out;
}

async function imagePage(file: File): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, (TARGET_WIDTH * 1.4) / bmp.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * s);
  canvas.height = Math.round(bmp.height * s);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** 인식 결과를 원본 위에 덧그린 작은 미리보기 — 사람이 판정 근거를 눈으로 확인하게 */
function thumbnail(src: HTMLCanvasElement, r: ScanResult): string {
  const w = 360;
  const s = w / src.width;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = Math.round(src.height * s);
  const x = c.getContext("2d")!;
  x.drawImage(src, 0, 0, c.width, c.height);
  if (r.ok) {
    r.centers.forEach((row, i) =>
      row.forEach((p, ci) => {
        const chosen = r.marks[i] != null && r.darkness[i][ci] === Math.max(...r.darkness[i]);
        if (!chosen && !r.flags[i]) return;
        x.strokeStyle = r.flags[i] ? "#f59e0b" : "#3182f6";
        x.lineWidth = 1.5;
        x.beginPath();
        x.arc(p.x * s, p.y * s, 4, 0, Math.PI * 2);
        x.stroke();
      }),
    );
  } else if (r.corners) {
    x.fillStyle = "#f04452";
    for (const p of r.corners) x.fillRect(p.x * s - 3, p.y * s - 3, 6, 6);
  }
  return c.toDataURL("image/jpeg", 0.7);
}

const nextChoice = (cur: string | null, choices: string[]) => {
  const i = cur == null ? -1 : choices.indexOf(cur);
  return i + 1 >= choices.length ? null : choices[i + 1];
};

export function ScanReview({
  slug, examId, questions, students,
}: {
  slug: string;
  examId: string;
  questions: Question[];
  students: Student[];
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [result, setResult] = useState<ActionState>({ ok: false, message: "" });
  const nameOf = new Map(students.map((s) => [s.id, s]));

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setResult({ ok: false, message: "" });
    const added: Item[] = [];
    let n = 0;
    for (const file of Array.from(files)) {
      let pages: HTMLCanvasElement[];
      try {
        pages = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
          ? await pdfPages(file)
          : [await imagePage(file)];
      } catch {
        added.push({ key: `${file.name}-err-${Date.now()}`, label: file.name, thumb: "", error: "파일을 열 수 없어요", studentId: null, marks: [], flags: [] });
        continue;
      }
      for (const [pi, canvas] of pages.entries()) {
        n++;
        setProgress(`${n}장째 읽는 중…`);
        await new Promise((r) => setTimeout(r)); // 진행 표시가 그려질 틈
        const ctx = canvas.getContext("2d")!;
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const r = scanSheet(img, questions);
        const label = pages.length > 1 ? `${file.name} · ${pi + 1}쪽` : file.name;
        const base = { key: `${file.name}-${pi}-${Date.now()}`, label, thumb: thumbnail(canvas, r) };
        if (!r.ok) {
          added.push({ ...base, error: r.error, studentId: null, marks: [], flags: [] });
        } else if (r.examId !== examId) {
          added.push({ ...base, error: "다른 시험의 답안지예요", studentId: null, marks: [], flags: [] });
        } else if (!nameOf.has(r.studentId)) {
          added.push({ ...base, error: "이 공간 수강생이 아니에요", studentId: null, marks: [], flags: [] });
        } else {
          added.push({ ...base, error: null, studentId: r.studentId, marks: r.marks, flags: r.flags });
        }
      }
    }
    setProgress(null);
    setItems((cur) => [...cur, ...added]);
  }

  const update = (key: string, fn: (it: Item) => Item) =>
    setItems((cur) => cur.map((it) => (it.key === key ? fn(it) : it)));

  const good = items.filter((it) => !it.error);
  const dupes = new Set(
    good.map((it) => it.studentId).filter((id, i, all) => id && all.indexOf(id) !== i),
  );
  const pendingFlags = good.reduce((a, it) => a + it.flags.filter(Boolean).length, 0);
  const ready = good.length > 0 && pendingFlags === 0 && dupes.size === 0;

  function save() {
    startSaving(async () => {
      const res = await saveScannedSheets(slug, examId, good.map((it) => ({ studentId: it.studentId!, marks: it.marks })));
      setResult(res);
      if (res.ok) setItems((cur) => cur.filter((it) => it.error));
    });
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-grey-300 bg-white py-10 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/40">
        <span className="text-[15px] font-bold text-grey-900">스캔 파일 올리기</span>
        <span className="text-[13px] text-grey-500">PDF(여러 쪽 가능) 또는 사진 · 여러 개를 한 번에 골라도 돼요</span>
        <input
          type="file" multiple accept="application/pdf,image/*" className="sr-only"
          onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }}
        />
        {progress && <span className="mt-2 text-[13px] font-semibold text-blue-600">{progress}</span>}
      </label>

      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-grey-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-3 text-[13.5px] text-grey-700">
            <span>인식 <b className="num text-grey-900">{good.length}</b>장</span>
            {items.length - good.length > 0 && <span className="text-red-500">실패 {items.length - good.length}장</span>}
            {pendingFlags > 0 && <span className="text-amber-500">확인할 칸 {pendingFlags}개</span>}
            {dupes.size > 0 && <span className="text-red-500">같은 학생 중복 {dupes.size}명</span>}
          </div>
          <div className="flex items-center gap-3">
            <Message ok={result.ok} message={result.message} />
            <Button variant="secondary" size="sm" onClick={() => setItems([])}>모두 지우기</Button>
            <Button variant="primary" size="sm" disabled={!ready || saving} onClick={save}>
              {saving ? "저장 중…" : `확정 저장 (${good.length}장)`}
            </Button>
          </div>
        </div>
      )}
      {!items.length && result.message && <Message ok={result.ok} message={result.message} />}

      <div className="space-y-3">
        {items.map((it) => {
          const st = it.studentId ? nameOf.get(it.studentId) : null;
          const flagged = it.flags.filter(Boolean).length;
          return (
            <div key={it.key} className="flex flex-col gap-4 rounded-card border border-grey-200 bg-white p-4 sm:flex-row">
              {it.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 만든 data URL 이라 next/image 를 쓸 수 없다
                <img src={it.thumb} alt={it.label} className="w-full shrink-0 rounded-md border border-grey-100 sm:w-[180px]" />
              ) : null}
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold text-grey-900">{st?.name ?? "—"}</span>
                  {it.error ? (
                    <Badge tone="red">{it.error}</Badge>
                  ) : dupes.has(it.studentId) ? (
                    <Badge tone="red">중복</Badge>
                  ) : flagged ? (
                    <Badge tone="amber">확인 {flagged}칸</Badge>
                  ) : (
                    <Badge tone="green">확인 완료</Badge>
                  )}
                  {st?.hasScore && !it.error && <span className="text-[12px] text-amber-500">기존 점수를 덮어써요</span>}
                  <span className="truncate text-[12px] text-grey-400">{it.label}</span>
                  <button
                    type="button" className="ml-auto text-[12.5px] font-semibold text-grey-500 hover:text-red-500"
                    onClick={() => setItems((cur) => cur.filter((x) => x.key !== it.key))}
                  >
                    빼기
                  </button>
                </div>

                {it.error ? (
                  <p className="text-[13px] text-grey-500">
                    이 장은 저장되지 않아요. 다시 스캔하거나, 시험 화면의 조교 대리 입력으로 넣어 주세요.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-10 gap-1">
                      {questions.map((q, i) => {
                        const f = it.flags[i];
                        const m = it.marks[i];
                        return (
                          <button
                            type="button" key={q.no}
                            title={f === "multi" ? "두 개 이상 칠함 — 눌러서 답 고르기" : f === "faint" ? "연하게 칠함 — 맞으면 한 번 눌러 확인" : "눌러서 바꾸기"}
                            onClick={() =>
                              update(it.key, (x) => {
                                const marks = [...x.marks];
                                const flags = [...x.flags];
                                // 표시된 칸을 처음 누르면 '확인'만, 그다음부터는 선지를 돌린다
                                if (flags[i]) flags[i] = null;
                                else marks[i] = nextChoice(marks[i], q.choices);
                                return { ...x, marks, flags };
                              })
                            }
                            className={`rounded-xs py-1 text-center transition-colors ${
                              f ? "bg-amber-50 text-amber-500 ring-1 ring-amber-500" : m ? "bg-blue-100 text-blue-600" : "bg-grey-50 text-grey-400"
                            }`}
                          >
                            <div className="text-[10px] leading-none opacity-70">{q.no}</div>
                            <div className="num text-[14px] font-bold leading-tight">{f === "multi" ? "?" : (m ?? "–")}</div>
                          </button>
                        );
                      })}
                    </div>
                    {flagged > 0 && (
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-grey-500">
                          노란 칸: 중복(?)은 눌러서 답을 고르고, 연한 마킹은 맞으면 한 번 눌러 확인하세요.
                        </span>
                        <Button
                          variant="weak" size="xs"
                          onClick={() => update(it.key, (x) => ({ ...x, flags: x.flags.map(() => null) }))}
                        >
                          이대로 확인
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
