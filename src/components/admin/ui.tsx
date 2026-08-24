/* 관리자 공용 UI 프리미티브 — Toss Design System 기반 */

import { Card, CardTitle, TONE, type Tone, surface, ProgressBar } from "@/components/ui/Card";

export { Card, ProgressBar, TONE };
export type { Tone };

/** 카드 배경 클래스 (그림자 없음 · 1px 회색 테두리) */
export const cardBase = surface;

export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return <CardTitle right={right}>{children}</CardTitle>;
}

/** 학원 도메인 상태값 → 토스 4색(파랑/초록/빨강/회색) 매핑 */
const STATUS_TONE: Record<string, Tone> = {
  // 수업·제출
  진행중: "blue",
  출석: "green",
  제출: "green",
  승인: "blue",
  완료: "grey",
  예정: "grey",
  미제출: "red",
  결석: "red",
  지각: "amber",
  신청: "amber",
  대기: "amber",
  // 할 일
  미완료: "red",
  면제: "grey",
  // 클리닉 예약
  예약: "blue",
  등원: "green",
  하원: "grey",
  미등원: "red",
  취소: "grey",
};

export function Badge({ label }: { label: string }) {
  const t = TONE[STATUS_TONE[label] ?? "grey"];
  return (
    <span
      className={`inline-flex items-center rounded-xs px-2.5 py-[3px] text-[12px] font-semibold tracking-[-0.02em] ${t.soft} ${t.text}`}
    >
      {label}
    </span>
  );
}

/** 준비중 화면 placeholder */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div
      className={`${cardBase} flex flex-col items-center justify-center gap-1.5 py-24 text-center`}
    >
      <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-grey-100 text-xl">
        🚧
      </div>
      <div className="text-[15px] font-bold text-grey-800">{title} 화면 준비 중</div>
      <p className="text-[13px] text-grey-500">곧 연결됩니다.</p>
    </div>
  );
}
