import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { ButtonLink } from "@/components/ui/Button";

/** 학원 관리(HQ) 레이아웃 — ERP 처럼 강사 · 강좌 두 메뉴 */
export function HqShell({
  active, title, subtitle, actions, children,
}: {
  active: "teachers" | "classes";
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const tab = (key: "teachers" | "classes", label: string, href: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`relative px-1 pb-3 pt-1 text-[14.5px] font-semibold transition-colors ${
        active === key ? "text-grey-900 after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-grey-900" : "text-grey-500 hover:text-grey-800"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="min-h-dvh bg-panel text-grey-900">
      <header className="sticky top-0 z-10 border-b border-grey-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-5 pt-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex size-9 items-center justify-center rounded-md bg-grey-900 text-[14px] font-bold text-white">세</Link>
            <div className="leading-tight">
              <div className="text-[12px] font-semibold text-grey-500">학원 관리</div>
              <h1 className="text-[19px] font-bold">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink href="/" variant="secondary" size="sm">강사 공간 목록</ButtonLink>
            <form action={signOut}>
              <button type="submit" className="h-9 px-2 text-[13px] font-semibold text-grey-500 hover:text-red-500">로그아웃</button>
            </form>
          </div>
        </div>
        <nav className="mx-auto mt-2 flex w-full max-w-[1600px] gap-5 px-5">
          {tab("teachers", "강사", "/hq")}
          {tab("classes", "강좌", "/hq/classes")}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1600px] space-y-4 px-5 py-5">
        {(subtitle || actions) && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-grey-500">{subtitle}</p>
            <div className="flex items-center gap-2">{actions}</div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
