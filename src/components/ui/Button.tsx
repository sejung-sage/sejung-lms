import Link from "next/link";

/**
 * Toss Design System 버튼.
 *
 * 규칙:
 *  - 한 화면에 primary(파랑)는 하나. 나머지는 secondary/weak/ghost.
 *  - 그림자 없음. 라운딩 12~14px. font-weight 600.
 *  - 누를 때 색이 진해지고(hover/active) 살짝 눌린다(scale).
 */

export type ButtonVariant =
  | "primary" // 파란 채움 — 화면의 주행동
  | "secondary" // 회색 채움 — 보조 행동
  | "weak" // 연한 파랑 — 파랑인데 주행동은 아닐 때
  | "outline" // 흰 배경 + 회색 테두리
  | "ghost" // 배경 없음
  | "danger"; // 빨강 채움 — 삭제/거절

export type ButtonSize = "xs" | "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700",
  secondary: "bg-grey-100 text-grey-700 hover:bg-grey-200 active:bg-grey-300",
  weak: "bg-blue-100 text-blue-600 hover:bg-blue-200 active:bg-blue-200",
  outline:
    "bg-white text-grey-700 border border-grey-200 hover:bg-grey-50 active:bg-grey-100",
  ghost: "bg-transparent text-grey-600 hover:bg-grey-100 active:bg-grey-200",
  danger: "bg-red-500 text-white hover:bg-red-600 active:bg-red-600",
};

const SIZE: Record<ButtonSize, string> = {
  xs: "h-8 rounded-[8px] px-3 text-[13px]",
  sm: "h-9 rounded-[10px] px-4 text-[14px]",
  md: "h-11 rounded-btn px-5 text-[15px]",
  lg: "h-[52px] rounded-btn-lg px-6 text-[17px]",
};

const BASE =
  "inline-flex shrink-0 select-none items-center justify-center gap-1.5 " +
  "font-semibold tracking-[-0.02em] whitespace-nowrap " +
  "transition-[background-color,transform] duration-100 ease-out " +
  "active:scale-[0.98] " +
  "disabled:pointer-events-none disabled:opacity-40";

export function buttonClass({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return [BASE, VARIANT[variant], SIZE[size], fullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant,
  size,
  fullWidth,
  className,
  children,
  type = "button",
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant,
  size,
  fullWidth,
  className,
  children,
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className={buttonClass({ variant, size, fullWidth, className })}>
      {children}
    </Link>
  );
}

/** 화면 하단에 고정되는 토스식 CTA (모바일 앱 화면용) */
export function StickyCta({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-grey-100 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
      {children}
    </div>
  );
}
