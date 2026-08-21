/**
 * 표면(surface) 프리미티브.
 *
 * 레퍼런스 규칙: 바탕은 흰색, 종속 표면만 회색(--panel).
 * 카드에 그림자를 쌓지 않는다 — 경계는 1px --line(#e5e8eb) 으로만 만들고
 * 정보 위계는 여백과 글자 굵기로 만든다. 그림자는 떠 있는 것에만.
 */

export const surface = "rounded-card bg-white border border-grey-200";

/** 종속 표면 — 카드 안의 카드, 표 머리, 통계 타일 */
export const panelSurface = "rounded-md bg-panel border border-grey-100";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`${surface} ${padded ? "p-5" : ""} ${className}`}>{children}</section>
  );
}

/** 카드 제목 — 컬러 바 같은 장식을 붙이지 않는다. 굵기로만 구분. */
export function CardTitle({
  children,
  right,
  className = "",
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 ${className}`}>
      <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-grey-900">
        {children}
      </h2>
      {right && <div className="shrink-0 text-[13px] text-grey-500">{right}</div>}
    </div>
  );
}

/**
 * 표/목록의 구역 머리 — 레퍼런스 .subHead
 * 회색 패널 바탕 + 12px/600 + 우측에 카운트.
 */
export function SubHead({
  children,
  count,
  className = "",
}: {
  children: React.ReactNode;
  count?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center border-b border-grey-100 bg-panel px-3.5 py-2 text-[12px] font-semibold text-grey-700 ${className}`}
    >
      {children}
      {count != null && (
        <span className="ml-auto text-[11px] font-normal text-grey-500">{count}</span>
      )}
    </div>
  );
}

/** 목록 한 줄 — 좌: 제목/설명, 우: 값/화살표 */
export function ListRow({
  title,
  desc,
  right,
  className = "",
}: {
  title: React.ReactNode;
  desc?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-btn px-2 py-3 ${className}`}
    >
      <div className="min-w-0">
        <div className="truncate text-[15px] font-semibold text-grey-800">{title}</div>
        {desc && <div className="mt-0.5 truncate text-[13px] text-grey-500">{desc}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-grey-100 ${className}`} />;
}

/* ── 상태 톤 ───────────────────────────────────────
   4색만 쓴다: 파랑(진행) / 초록(완료·정상) / 빨강(문제) / 회색(중립).
   amber 는 '사람이 확인해야 하는 대기'에만.

   soft/text 조합은 전부 흰 배경 기준 4.5:1 이상이다.
   (이전 yellow #ffc845 는 1.8:1 이라 글자로 못 썼다) */

export type Tone = "blue" | "green" | "red" | "amber" | "yellow" | "grey";

type ToneSet = { soft: string; text: string; bar: string; solid: string; border: string };

const AMBER: ToneSet = {
  soft: "bg-amber-50",
  text: "text-amber-500",
  bar: "bg-amber-500",
  solid: "bg-amber-500",
  border: "border-amber-100",
};

export const TONE: Record<Tone, ToneSet> = {
  blue: {
    soft: "bg-blue-100",
    text: "text-blue-600",
    bar: "bg-blue-500",
    solid: "bg-blue-500",
    border: "border-blue-200",
  },
  green: {
    soft: "bg-green-50",
    text: "text-green-500",
    bar: "bg-green-500",
    solid: "bg-green-500",
    border: "border-green-100",
  },
  red: {
    soft: "bg-red-50",
    text: "text-red-500",
    bar: "bg-red-500",
    solid: "bg-red-500",
    border: "border-red-100",
  },
  amber: AMBER,
  // 기존 호출부 호환용 별칭 — 새 코드에서는 amber 를 쓴다.
  yellow: AMBER,
  grey: {
    soft: "bg-grey-100",
    text: "text-grey-600",
    bar: "bg-grey-400",
    solid: "bg-grey-500",
    border: "border-grey-200",
  },
};

/** 레퍼런스 .tag — 라운딩 6, 12px/600 */
export function Badge({
  children,
  tone = "grey",
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-xs px-2.5 py-[3px] text-[12px] font-semibold tracking-[-0.02em] whitespace-nowrap ${TONE[tone].soft} ${TONE[tone].text} ${className}`}
    >
      {children}
    </span>
  );
}

/** 진행 막대 — 얇고(6px) 라운드 */
export function ProgressBar({
  value,
  tone = "blue",
  className = "",
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-grey-100 ${className}`}>
      <div
        className={`h-full rounded-full ${TONE[tone].bar}`}
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}
