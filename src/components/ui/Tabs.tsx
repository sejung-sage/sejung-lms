import Link from "next/link";

/**
 * Toss Design System 탭.
 *
 * 토스는 탭을 두 가지로만 쓴다.
 *  1) SegmentedTabs — 회색 트랙 위에 흰 알약이 미끄러지는 형태. 2~4개 필터용.
 *  2) UnderlineTabs — 밑줄 2px. 화면을 나누는 상위 내비게이션용.
 * 공통: 비활성 grey-500 / 활성 grey-900, weight 600, 자간 -0.02em.
 */

export type TabItem = {
  key: string;
  label: string;
  href?: string;
  badge?: number | string;
};

/* ── 1) 세그먼트 탭 ─────────────────────────────── */

export function SegmentedTabs({
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
      className={`inline-flex w-full items-center gap-1 rounded-btn bg-grey-100 p-1 ${className}`}
    >
      {items.map((t) => {
        const on = t.key === active;
        const cls = [
          "flex h-9 flex-1 items-center justify-center gap-1 rounded-[10px]",
          "text-[14px] font-semibold tracking-[-0.02em]",
          "transition-colors duration-100",
          on
            ? "bg-white text-grey-900 shadow-toss"
            : "text-grey-500 hover:text-grey-700",
        ].join(" ");

        const inner = (
          <>
            {t.label}
            {t.badge != null && (
              <span className={on ? "text-blue-500" : "text-grey-400"}>{t.badge}</span>
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
      className={`flex items-center gap-5 border-b border-grey-200 ${className}`}
    >
      {items.map((t) => {
        const on = t.key === active;
        const cls = [
          "relative inline-flex h-12 items-center gap-1.5",
          "text-[15px] font-semibold tracking-[-0.02em]",
          "transition-colors duration-100",
          on
            ? "text-grey-900 after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-grey-900"
            : "text-grey-500 hover:text-grey-700",
        ].join(" ");

        const inner = (
          <>
            {t.label}
            {t.badge != null && (
              <span
                className={`rounded-full px-1.5 text-[12px] font-bold ${
                  on ? "bg-blue-100 text-blue-600" : "bg-grey-100 text-grey-500"
                }`}
              >
                {t.badge}
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
          "inline-flex h-8 shrink-0 items-center rounded-full px-3.5",
          "text-[14px] font-semibold tracking-[-0.02em] transition-colors duration-100",
          on
            ? "bg-grey-900 text-white"
            : "bg-white text-grey-600 border border-grey-200 hover:bg-grey-50",
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
