/* 관리자 공용 UI 프리미티브 */

export const cardBase =
  "rounded-2xl bg-white shadow-[0_1px_3px_rgba(30,34,51,0.04),0_8px_24px_-16px_rgba(30,34,51,0.12)] ring-1 ring-slate-900/[0.04]";

export type Tint = "violet" | "sky" | "rose" | "amber" | "emerald";
export const TINT: Record<Tint, { soft: string; text: string; bar: string }> = {
  violet: { soft: "bg-violet-50", text: "text-violet-600", bar: "bg-violet-400" },
  sky: { soft: "bg-sky-50", text: "text-sky-600", bar: "bg-sky-400" },
  rose: { soft: "bg-rose-50", text: "text-rose-500", bar: "bg-rose-400" },
  amber: { soft: "bg-amber-50", text: "text-amber-600", bar: "bg-amber-400" },
  emerald: { soft: "bg-emerald-50", text: "text-emerald-600", bar: "bg-emerald-400" },
};

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`${cardBase} p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
      <span className="h-3.5 w-1 rounded-full" style={{ backgroundColor: accent }} />
      {children}
    </h2>
  );
}

const STATUS: Record<string, string> = {
  진행중: "bg-emerald-100 text-emerald-600",
  출석: "bg-emerald-100 text-emerald-600",
  예정: "bg-slate-100 text-slate-400",
  완료: "bg-slate-100 text-slate-400",
  제출: "bg-emerald-100 text-emerald-600",
  미제출: "bg-rose-100 text-rose-500",
  지각: "bg-amber-100 text-amber-600",
  결석: "bg-rose-100 text-rose-500",
  신청: "bg-amber-100 text-amber-600",
  승인: "bg-sky-100 text-sky-600",
  대기: "bg-amber-100 text-amber-600",
};
export function Badge({ label }: { label: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS[label] ?? "bg-slate-100 text-slate-500"}`}>
      {label}
    </span>
  );
}

/** 준비중 화면 placeholder */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className={`${cardBase} flex flex-col items-center justify-center gap-2 py-20 text-center`}>
      <div className="text-3xl">🚧</div>
      <div className="text-sm font-semibold text-slate-600">{title} 화면 준비 중</div>
      <p className="text-xs text-slate-400">곧 연결됩니다.</p>
    </div>
  );
}
