import jsQR from "jsqr";
import {
  PAGE, FIDUCIAL, FIDUCIALS, QR_BOX, GRID, bubbleCenter, decodeSheetQr,
} from "@/lib/omr-sheet";

/**
 * 종이 OMR 스캔 인식 — DOM 을 모르는 순수 함수.
 * 입력은 RGBA 픽셀(ImageData 와 같은 모양)이라 브라우저 캔버스에서도, Node 테스트에서도 같은 코드가 돈다.
 *
 * 순서
 *   1) 귀퉁이 검은 네모 4개를 찾는다 (축소 이미지에서 덩어리 찾기)
 *   2) 네 점으로 mm → 픽셀 원근 변환(호모그래피)을 푼다. 기울어진 스캔·폰 촬영도 여기서 펴진다
 *   3) QR 자리를 잘라 시험·학생을 읽는다. 못 읽으면 180° 뒤집힌 것으로 보고 한 번 더
 *   4) 버블마다 안쪽 원의 밝기를 재서, 종이 바탕 대비 얼마나 어두운지로 마킹을 판정한다
 */

export type Pixels = { data: Uint8ClampedArray; width: number; height: number };
type Pt = { x: number; y: number };

export type MarkFlag = "multi" | "faint" | null;

export type ScanResult =
  | {
      ok: true;
      examId: string;
      studentId: string;
      marks: (string | null)[];
      flags: MarkFlag[];
      /** 문항×선지 농도(0=종이, 1=마커만큼 검정) — 검수 화면에서 근거로 보여준다 */
      darkness: number[][];
      /** 버블 중심 픽셀 좌표 — 미리보기에 표시용 */
      centers: Pt[][];
    }
  | { ok: false; error: string; corners?: Pt[] };

/** 판정 기준 — 합성 스캔(볼펜·연필·연한 연필·회전·뒤집힘·조명)으로 맞춘 값. 실제 스캔으로 다시 확인할 것 */
export const THRESHOLD = {
  mark: 0.4,
  faint: 0.18,
  /** 두 개가 다 진해도 이만큼 차이 나면 진한 쪽을 답으로 (지우다 남은 자국) */
  dominant: 0.3,
};

/* ── 1. 흑백 ──────────────────────────────────── */

function toGray(px: Pixels): Uint8Array {
  const g = new Uint8Array(px.width * px.height);
  const d = px.data;
  for (let i = 0, j = 0; j < g.length; i += 4, j++) {
    g[j] = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
  }
  return g;
}

/** 오츠 임계값 — 종이/잉크 두 무리를 가장 잘 가르는 밝기 */
function otsu(g: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (const v of g) hist[v]++;
  const total = g.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, t = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; t = i; }
  }
  return t;
}

/* ── 2. 귀퉁이 마커 찾기 ───────────────────────── */

function downsample(g: Uint8Array, w: number, h: number, target: number) {
  const s = Math.max(1, w / target);
  const sw = Math.floor(w / s), sh = Math.floor(h / s);
  const out = new Uint8Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      // 칸 안의 최솟값을 취한다 — 얇은 잉크도 사라지지 않게
      let m = 255;
      const x0 = Math.floor(x * s), y0 = Math.floor(y * s);
      const x1 = Math.min(w, Math.floor((x + 1) * s)), y1 = Math.min(h, Math.floor((y + 1) * s));
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) m = Math.min(m, g[yy * w + xx]);
      out[y * sw + x] = m;
    }
  }
  return { g: out, w: sw, h: sh, s };
}

type Blob = { area: number; cx: number; cy: number; x0: number; y0: number; x1: number; y1: number };

function blobs(bin: Uint8Array, w: number, h: number): Blob[] {
  const seen = new Uint8Array(w * h);
  const out: Blob[] = [];
  const stack: number[] = [];
  for (let start = 0; start < bin.length; start++) {
    if (!bin[start] || seen[start]) continue;
    let area = 0, sx = 0, sy = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p - x) / w;
      area++; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of nb) if (q >= 0 && bin[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
    }
    out.push({ area, cx: sx / area, cy: sy / area, x0, y0, x1, y1 });
  }
  return out;
}

/**
 * 네 귀퉁이 마커 중심(원본 픽셀). 순서 tl, tr, bl, br.
 * 조건: 꽉 찬(채움 80%↑) 정사각형(가로세로 비 0.7~1.4), 크기는 이미지 폭의 1.5~8%.
 * 각 사분면에서 그런 덩어리 중 이미지 모서리에 가장 가까운 것을 고른다.
 */
export function findFiducials(px: Pixels): Pt[] | null {
  const gray = toGray(px);
  const small = downsample(gray, px.width, px.height, 700);
  const t = otsu(small.g);
  const bin = new Uint8Array(small.g.length);
  for (let i = 0; i < bin.length; i++) bin[i] = small.g[i] < Math.min(t, 140) ? 1 : 0;

  const minSide = small.w * 0.02, maxSide = small.w * 0.08;
  const cands = blobs(bin, small.w, small.h).filter((b) => {
    const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
    const ratio = bw / bh;
    return bw >= minSide && bw <= maxSide && ratio > 0.7 && ratio < 1.4 && b.area / (bw * bh) > 0.8;
  });

  const corners: Pt[] = [
    { x: 0, y: 0 }, { x: small.w, y: 0 }, { x: 0, y: small.h }, { x: small.w, y: small.h },
  ];
  const picked = corners.map((c) => {
    const inQuad = cands.filter((b) =>
      (c.x === 0 ? b.cx < small.w / 2 : b.cx >= small.w / 2) && (c.y === 0 ? b.cy < small.h / 2 : b.cy >= small.h / 2),
    );
    inQuad.sort((a, b) => Math.hypot(a.cx - c.x, a.cy - c.y) - Math.hypot(b.cx - c.x, b.cy - c.y));
    return inQuad[0];
  });
  if (picked.some((b) => !b)) return null;
  return picked.map((b) => ({ x: (b!.cx + 0.5) * small.s, y: (b!.cy + 0.5) * small.s }));
}

/* ── 3. 원근 변환 ─────────────────────────────── */

/** 4쌍의 점으로 3×3 호모그래피(src→dst)를 푼다. 8×8 연립방정식 가우스 소거. */
export function homography(src: Pt[], dst: Pt[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i], { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  return [...b.map((v, i) => v / A[i][i]), 1];
}

export function project(H: number[], p: Pt): Pt {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return { x: (H[0] * p.x + H[1] * p.y + H[2]) / w, y: (H[3] * p.x + H[4] * p.y + H[5]) / w };
}

const MM_CORNERS: Pt[] = [FIDUCIALS.tl, FIDUCIALS.tr, FIDUCIALS.bl, FIDUCIALS.br];

/* ── 4. QR ───────────────────────────────────── */

function readQr(px: Pixels, H: number[]) {
  const m = 4;
  const pts = [
    { x: QR_BOX.x - m, y: QR_BOX.y - m }, { x: QR_BOX.x + QR_BOX.size + m, y: QR_BOX.y - m },
    { x: QR_BOX.x - m, y: QR_BOX.y + QR_BOX.size + m }, { x: QR_BOX.x + QR_BOX.size + m, y: QR_BOX.y + QR_BOX.size + m },
  ].map((p) => project(H, p));
  const x0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.x))));
  const y0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.y))));
  const x1 = Math.min(px.width, Math.ceil(Math.max(...pts.map((p) => p.x))));
  const y1 = Math.min(px.height, Math.ceil(Math.max(...pts.map((p) => p.y))));
  const cw = x1 - x0, ch = y1 - y0;
  if (cw < 20 || ch < 20) return null;

  const crop = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const from = ((y0 + y) * px.width + x0) * 4;
    crop.set(px.data.subarray(from, from + cw * 4), y * cw * 4);
  }
  const code = jsQR(crop, cw, ch, { inversionAttempts: "dontInvert" });
  return code ? decodeSheetQr(code.data) : null;
}

/* ── 5. 버블 ─────────────────────────────────── */

/** 버블 안쪽 원(반지름의 55%)의 평균 밝기. 테두리 선은 안 닿게. */
function bubbleMean(gray: Uint8Array, w: number, h: number, H: number[], c: Pt) {
  const r = (GRID.bubbleDiameter / 2) * 0.55;
  let sum = 0, n = 0;
  const step = r / 4;
  for (let dy = -r; dy <= r + 1e-9; dy += step) {
    for (let dx = -r; dx <= r + 1e-9; dx += step) {
      if (dx * dx + dy * dy > r * r) continue;
      const p = project(H, { x: c.x + dx, y: c.y + dy });
      const x = Math.round(p.x), y = Math.round(p.y);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      sum += gray[y * w + x]; n++;
    }
  }
  return n ? sum / n : 255;
}

function fiducialMean(gray: Uint8Array, w: number, h: number, H: number[]) {
  const s = FIDUCIAL.size * 0.3;
  let sum = 0, n = 0;
  for (const f of MM_CORNERS) {
    for (const d of [{ x: -s, y: -s }, { x: s, y: -s }, { x: -s, y: s }, { x: s, y: s }, { x: 0, y: 0 }]) {
      const p = project(H, { x: f.x + d.x, y: f.y + d.y });
      const x = Math.round(p.x), y = Math.round(p.y);
      if (x >= 0 && y >= 0 && x < w && y < h) { sum += gray[y * w + x]; n++; }
    }
  }
  return n ? sum / n : 0;
}

/* ── 한 장 읽기 ─────────────────────────────── */

export function scanSheet(px: Pixels, questions: { choices: string[] }[]): ScanResult {
  const found = findFiducials(px);
  if (!found) return { ok: false, error: "귀퉁이 검은 네모 4개를 찾지 못했어요" };

  // 정방향으로 먼저, QR 이 안 읽히면 180° 뒤집어 넣은 것으로 보고 한 번 더
  const orders = [found, [found[3], found[2], found[1], found[0]]];
  let H: number[] | null = null;
  let qr: ReturnType<typeof readQr> = null;
  for (const o of orders) {
    const h = homography(MM_CORNERS, o);
    const q = readQr(px, h);
    if (q) { H = h; qr = q; break; }
  }
  if (!H || !qr) return { ok: false, error: "QR 코드를 읽지 못했어요", corners: found };

  const gray = toGray(px);
  const means = questions.map((q, i) => q.choices.map((_, c) => bubbleMean(gray, px.width, px.height, H!, bubbleCenter(i, c))));
  const all = means.flat().sort((a, b) => a - b);
  const paper = all[Math.floor(all.length / 2)]; // 대부분은 안 칠한 버블이라 중앙값이 종이색
  const ink = Math.min(fiducialMean(gray, px.width, px.height, H), paper - 40);
  const darkness = means.map((row) => row.map((m) => Math.max(0, Math.min(1, (paper - m) / (paper - ink)))));

  // 학생마다 필기구 진하기가 다르다. 이 장에서 칠한 칸들의 중앙값을 '이 학생의 보통 마킹'으로 보고,
  // 연필로 연하게 쓰는 학생은 기준을 그만큼 낮춘다. 그래야 정상 마킹 20칸이 전부 '확인 필요'로 뜨지 않는다.
  // 한 장 안에서 유독 연한 칸(지우다 남은 자국 등)은 여전히 확인 대상으로 남는다.
  const tops = darkness.map((row) => Math.max(...row)).filter((d) => d >= THRESHOLD.faint).sort((a, b) => a - b);
  const usual = tops.length ? tops[Math.floor(tops.length / 2)] : THRESHOLD.mark;
  const markAt = Math.min(THRESHOLD.mark, Math.max(THRESHOLD.faint + 0.05, usual * 0.6));

  const marks: (string | null)[] = [];
  const flags: MarkFlag[] = [];
  darkness.forEach((row, i) => {
    const order = row.map((d, c) => ({ d, c })).sort((a, b) => b.d - a.d);
    const [top, second] = order;
    const choices = questions[i].choices;
    if (top.d >= markAt) {
      if (second && second.d >= markAt && top.d - second.d < THRESHOLD.dominant) {
        marks.push(null); flags.push("multi");
      } else {
        marks.push(choices[top.c]);
        flags.push(second && second.d >= THRESHOLD.faint ? "faint" : null);
      }
    } else if (top.d >= THRESHOLD.faint) {
      // 연하게 칠한 것 — 일단 답으로 잡되 사람이 확인하게
      marks.push(choices[top.c]); flags.push("faint");
    } else {
      marks.push(null); flags.push(null);
    }
  });

  const centers = questions.map((q, i) => q.choices.map((_, c) => project(H!, bubbleCenter(i, c))));
  return { ok: true, examId: qr.examId, studentId: qr.studentId, marks, flags, darkness, centers };
}

/** 페이지 크기 대비 마커 위치 비율 — 미리보기에 '이렇게 넣어주세요' 안내용 */
export const PAGE_ASPECT = PAGE.h / PAGE.w;
