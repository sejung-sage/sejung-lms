import Link from "next/link";
import type { SpaceDetail } from "@/lib/spaces";
import { StudentTabBar, type StudentTab } from "./StudentTabBar";

/** 학생 앱 공용 프레임: 상단바 + 콘텐츠 + 하단 탭. */
export function StudentFrame({
  space, slug, active, pageLabel, children,
}: {
  space: SpaceDetail;
  slug: string;
  active: StudentTab;
  pageLabel?: string;
  children: React.ReactNode;
}) {
  const accent = space.accent_color;
  const initial = space.name.replace(/쌤$/, "").charAt(0) || space.name.charAt(0);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[#F6F5FB] pb-24">
      <header className="flex items-center justify-between px-4 pb-2 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-[26%] text-sm font-bold text-white shadow-sm"
            style={{ background: `linear-gradient(145deg, ${accent}, ${accent}c0)` }}>
            {initial}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-900">{pageLabel ?? space.name}</div>
            <div className="text-[11px] text-slate-400">{space.subject} · 학생</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/s/${slug}`} className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-500 shadow-sm ring-1 ring-black/5">
            관리자 뷰
          </Link>
          <button className="flex size-9 items-center justify-center rounded-full bg-white/70 text-slate-400 shadow-sm ring-1 ring-black/5">🔔</button>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 pt-2">{children}</main>

      <StudentTabBar slug={slug} active={active} accent={accent} />
    </div>
  );
}
