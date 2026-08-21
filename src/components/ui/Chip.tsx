/**
 * 칩 — 대치온 CRM 의 시각 언어를 그대로 가져온 것.
 *
 * 대치온 화면에서 정보 대부분은 문장이 아니라 칩으로 전달된다.
 *   점수 37점 · 등급 3등급 · 상태 완료/미통과 · 출결 현영지결 · 등수변동 ▲4
 * 표 한 줄에 이런 게 대여섯 개씩 들어가므로 칩은 작고(11~13px) 조용해야 하고,
 * 색은 '문제가 있는 것'에만 쓴다. 나머지는 회색.
 */

import { TONE, type Tone } from "./Card";

/* ── 점수 / 등급 ───────────────────────────────────
   점수는 흰 배경 + 테두리(값 자체가 주인공), 등급은 회색 채움(부가정보). */

export function ScoreChip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-grey-200 bg-white px-2.5 py-[3px] text-[13px] font-bold text-grey-900 whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

export function GradeChip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-grey-100 px-2.5 py-[3px] text-[12.5px] font-semibold text-grey-700 whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

/* ── 상태 ─────────────────────────────────────────
   solid = 확정된 결과(완료), soft = 진행/문제 상태. */

export function StatusChip({
  children,
  tone = "grey",
  solid = false,
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  solid?: boolean;
  className?: string;
}) {
  const t = TONE[tone];
  const skin = solid ? `${t.solid} text-white` : `${t.soft} ${t.text}`;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold whitespace-nowrap ${skin} ${className}`}
    >
      {children}
    </span>
  );
}

/** 회색 카운트 알약 — 탭·제목 옆의 "56명" "6개" */
export function CountPill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-grey-100 px-2 py-0.5 text-[12px] font-semibold text-grey-600 ${className}`}
    >
      {children}
    </span>
  );
}

/* ── 등수 변동 ─────────────────────────────────────
   올라가면 초록 ▲, 내려가면 빨강 ▼, 그대로면 아무것도 안 그린다.
   (0을 '—'로 그리면 표가 기호로 뒤덮인다) */

export function DeltaChip({ value, className = "" }: { value: number; className?: string }) {
  if (!value) return null;
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11.5px] font-bold ${up ? "text-green-500" : "text-red-500"} ${className}`}
      aria-label={up ? `${value}등 상승` : `${-value}등 하락`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {Math.abs(value)}
    </span>
  );
}

/* ── 출결 ─────────────────────────────────────────
   차시별 출결을 한 글자 칩으로 늘어놓는다. 대치온 수강생 목록의 '출결 이력' 열.
   대부분이 '현장'이므로 현장은 회색으로 조용히 두고, 문제 상태만 색을 얻는다. */

export type AttendanceStatus =
  | "present"
  | "video"
  | "late"
  | "early_leave"
  | "absent"
  | "withdrawn"
  | "none"
  | "undecided";

const ATTEND: Record<AttendanceStatus, { short: string; label: string; skin: string }> = {
  present:     { short: "현", label: "현장", skin: "bg-grey-100 text-grey-700" },
  video:       { short: "영", label: "영상", skin: "bg-blue-100 text-blue-600" },
  late:        { short: "지", label: "지각", skin: "bg-amber-50 text-amber-500" },
  early_leave: { short: "조", label: "조퇴", skin: "bg-amber-50 text-amber-500" },
  absent:      { short: "결", label: "결석", skin: "bg-red-50 text-red-500" },
  withdrawn:   { short: "퇴", label: "퇴원", skin: "bg-grey-200 text-grey-600" },
  none:        { short: "부", label: "부재", skin: "bg-grey-50 text-grey-400" },
  undecided:   { short: "미", label: "미정", skin: "bg-white text-grey-300 border border-dashed border-grey-300" },
};

export function AttendChip({ status, className = "" }: { status: AttendanceStatus; className?: string }) {
  const a = ATTEND[status];
  return (
    <span
      title={a.label}
      className={`inline-flex size-[22px] shrink-0 items-center justify-center rounded-xs text-[11px] font-bold ${a.skin} ${className}`}
    >
      <span className="sr-only">{a.label}</span>
      <span aria-hidden>{a.short}</span>
    </span>
  );
}

/** 출결 이력 한 줄 — 오래된 차시가 왼쪽, 최근이 오른쪽. */
export function AttendStrip({
  history,
  className = "",
}: {
  history: AttendanceStatus[];
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-[3px] ${className}`}>
      {history.map((s, i) => (
        <AttendChip key={i} status={s} />
      ))}
    </div>
  );
}

export { ATTEND };
