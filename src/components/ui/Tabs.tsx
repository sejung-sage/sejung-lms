import Link from "next/link";
import { CountPill } from "./Chip";

/**
 * 탭 3종.
 *
 *  1) PillTabs      — 레퍼런스의 주력. 회색 알약, 선택된 것만 파랑 채움.
 *                     개수를 크게(15px/700) 붙여 "무엇이 몇 건인지"를 탭이 겸한다.
 *  2) UnderlineTabs — 화면을 나누는 상위 내비게이션 (대치온 강의 상세의 탭).
 *  3) ChipTabs      — 가로 스크롤 필터.
 *
 * 셋을 한 화면에 겹쳐 쓰지 않는다. PillTabs 로 큰 구획을 나눴으면
 * 그 안은 UnderlineTabs 를 쓰지 말고 ChipTabs 로 좁힌다.
 */

export type TabItem = {
  key: string;
  label: string;
  href?: string;
  badge?: number | string;
  /** 개수 — PillTabs 에서 라벨 옆에 크게 표시된다 */
  count?: number | string;
  icon?: React.ReactNode;
};

/* ── 1) 알약 탭 (레퍼런스 .tabBtn) ────────────────── */

export function PillTabs({
  items,
  active,
  size = "md",
  className = "",
}: {
  items: TabItem[];
  active: string;
  size?: "md" | "sm";
  className?: string;
}) {
  const pad = size === "sm" ? "px-3.5 py-[7px]" : "px-[18px] py-2.5";
  const label = size === "sm" ? "text-[13px]" : "text-[14px]";

  return (
    <div role="tablist" className={`flex flex-wrap items-center gap-2 ${className}`}>
      {items.map((t) => {
        const on = t.key === active;
        const cls = [
          "pressable inline-flex items-baseline gap-1.5 rounded-full",
          "tracking-[-0.02em] transition-colors duration-100",
          pad,
          on
            ? "bg-blue-500 text-white hover:bg-blue-600"
            : "bg-grey-100 text-grey-700 hover:bg-grey-250 hover:text-grey-900",
        ].join(" ");

        const inner = (
          <>
            {t.icon}
            <span className={`${label} font-semibold`}>{t.label}</span>
            {t.count != null && (
              <span
                className={`text-[15px] font-bold tracking-[-0.03em] ${on ? "text-white" : "text-grey-500"}`}
              >
                {t.count}
              </span>
            )}
          </>
        );

        return t.href ? (
          <Link key={t.key} href={t.href} role="tab" aria-selected={on} className={cls}>
            {inner}
          </Link>
        ) : (
          <span key={t.key} role="tab" aria-selected={on} className={cls}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}

/* ── 2) 밑줄 탭 ─────────────────────────────────── */

export function UnderlineTabs({
  items,
  active,
  className = "",
}: {
  items: TabItem[];
  active: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-5 overflow-x-auto border-b border-grey-200 ${className}`}
    >
      {items.map((t) => {
        const on = t.key === active;
        const cls = [
          "relative inline-flex h-12 shrink-0 items-center gap-1.5",
          "text-[15px] font-semibold tracking-[-0.02em]",
          "transition-colors duration-100",
          on
            ? "text-grey-900 after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-grey-900"
            : "text-grey-500 hover:text-grey-700",
        ].join(" ");

        const inner = (
          <>
            {t.icon}
            {t.label}
            {t.badge != null && <CountPill>{t.badge}</CountPill>}
          </>
        );

        return t.href ? (
          <Link key={t.key} href={t.href} role="tab" aria-selected={on} className={cls}>
            {inner}
          </Link>
        ) : (
          <span key={t.key} role="tab" aria-selected={on} className={cls}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}

/* ── 3) 칩 필터 (가로 스크롤) ───────────────────── */

export function ChipTabs({
  items,
  active,
  className = "",
}: {
  items: TabItem[];
  active: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 overflow-x-auto ${className}`}>
      {items.map((t) => {
        const on = t.key === active;
        const cls = [
          "pressable inline-flex h-8 shrink-0 items-center rounded-full px-3.5",
          "text-[13.5px] font-semibold tracking-[-0.02em] transition-colors duration-100",
          on
            ? "bg-grey-900 text-white"
            : "border border-grey-200 bg-white text-grey-600 hover:bg-grey-50",
        ].join(" ");

        return t.href ? (
          <Link key={t.key} href={t.href} className={cls}>
            {t.label}
          </Link>
        ) : (
          <span key={t.key} className={cls}>
            {t.label}
          </span>
        );
      })}
    </div>
  );
}

/** 기존 호출부 호환 — 세그먼트 탭은 알약 탭으로 흡수됐다. */
export const SegmentedTabs = PillTabs;
