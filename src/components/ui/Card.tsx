/**
 * Toss Design System 표면(surface) 프리미티브.
 *
 * 토스는 카드에 그림자를 쌓지 않는다.
 * 회색 배경(grey-50) 위에 흰 카드를 얹고, 경계는 1px 회색선으로만 만든다.
 * 정보 위계는 그림자가 아니라 여백과 글자 굵기로 만든다.
 */

export const surface = "rounded-card bg-white border border-grey-100";

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

/** 카드 제목 — 토스는 컬러 바 같은 장식을 안 붙인다. 굵기로만 구분. */
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

/* ── 상태 배지 ─────────────────────────────────────
   토스는 상태색을 4개로만 쓴다: 파랑(진행) / 초록(완료·정상)
   / 빨강(문제) / 회색(중립). 노랑은 '대기'에만. */

export type Tone = "blue" | "green" | "red" | "yellow" | "grey";

export const TONE: Record<Tone, { soft: string; text: string; bar: string; solid: string }> = {
  blue: { soft: "bg-blue-100", text: "text-blue-600", bar: "bg-blue-500", solid: "bg-blue-500" },
  green: {
    soft: "bg-green-100",
    text: "text-green-600",
    bar: "bg-green-500",
    solid: "bg-green-500",
  },
  red: { soft: "bg-red-100", text: "text-red-500", bar: "bg-red-500", solid: "bg-red-500" },
  yellow: {
    soft: "bg-yellow-100",
    text: "text-yellow-600",
    bar: "bg-yellow-500",
    solid: "bg-yellow-500",
  },
  grey: { soft: "bg-grey-100", text: "text-grey-600", bar: "bg-grey-400", solid: "bg-grey-500" },
};

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
      className={`inline-flex items-center rounded-[6px] px-2 py-1 text-[12px] font-semibold tracking-[-0.02em] ${TONE[tone].soft} ${TONE[tone].text} ${className}`}
    >
      {children}
    </span>
  );
}

/** 진행 막대 — 토스식으로 얇고(6px) 라운드 */
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
