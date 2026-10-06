/**
 * 종이 OMR 답안지 레이아웃 — 인쇄와 인식이 공유하는 단 하나의 좌표계.
 *
 * 단위는 전부 mm, 원점은 A4 왼쪽 위. 인쇄 페이지는 이 값으로 그리고,
 * 스캔 인식은 네 귀퉁이 마커를 찾아 이 mm 좌표를 픽셀로 사상한다.
 * 그래서 여기 숫자를 바꾸면 이미 인쇄해 나눠준 답안지는 못 읽는다 — 바꿀 땐 VERSION 을 올릴 것.
 */

export const SHEET_VERSION = "v1";

export const PAGE = { w: 210, h: 297 };

/** 귀퉁이 마커: 꽉 찬 검은 정사각형. 중심 좌표 기준. */
export const FIDUCIAL = { size: 8 };
export const FIDUCIALS = {
  tl: { x: 15, y: 15 },
  tr: { x: 195, y: 15 },
  bl: { x: 15, y: 282 },
  br: { x: 195, y: 282 },
} as const;

/** 오른쪽 위 QR 자리 (왼쪽 위 꼭짓점 + 한 변) */
export const QR_BOX = { x: 158, y: 24, size: 32 };

/** 버블 격자: 세로로 20문항씩, 최대 3단 = 60문항 */
export const GRID = {
  top: 74,
  rowPitch: 9.5,
  rowsPerColumn: 20,
  columns: 3,
  columnLeft: [24, 84, 144],
  /** 단 왼쪽에서 첫 버블 중심까지 */
  firstBubble: 13,
  choicePitch: 8.6,
  bubbleDiameter: 5.6,
};

export const MAX_QUESTIONS = GRID.rowsPerColumn * GRID.columns;

/** 문항 번호 칸의 기준선 (문항 i 는 0부터) */
export function rowOf(i: number) {
  const col = Math.floor(i / GRID.rowsPerColumn);
  const row = i % GRID.rowsPerColumn;
  return { col, y: GRID.top + row * GRID.rowPitch, left: GRID.columnLeft[col] };
}

/** 문항 i, 선지 c(0부터)의 버블 중심 mm */
export function bubbleCenter(i: number, c: number) {
  const { y, left } = rowOf(i);
  return { x: left + GRID.firstBubble + c * GRID.choicePitch, y };
}

/* ── QR 내용 ───────────────────────────────────────
   시험 id + 학생 id. 버전을 앞에 붙여 둔다 — 레이아웃이 바뀌면 옛 답안지를 거를 수 있게. */

const PREFIX = `SJOMR:${SHEET_VERSION}:`;

export function encodeSheetQr(examId: string, studentId: string) {
  return `${PREFIX}${examId}:${studentId}`;
}

export function decodeSheetQr(text: string): { examId: string; studentId: string } | null {
  if (!text.startsWith(PREFIX)) return null;
  const [examId, studentId] = text.slice(PREFIX.length).split(":");
  const uuid = /^[0-9a-f-]{36}$/i;
  if (!uuid.test(examId ?? "") || !uuid.test(studentId ?? "")) return null;
  return { examId, studentId };
}
