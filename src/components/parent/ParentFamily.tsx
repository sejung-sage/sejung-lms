import Link from "next/link";
import type { ChildCourse, ChildRef } from "@/lib/family";
import { Card, Badge } from "@/components/ui/Card";
import { ChipTabs } from "@/components/ui/Tabs";
import { ButtonLink } from "@/components/ui/Button";

const when = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" });

/** 작은 추이 선 — 카드 안에서 오르내림만 보이게 */
function Spark({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const W = 96, H = 28, lo = Math.min(...points, 40), hi = Math.max(...points, 100);
  const xy = points.map((p, i) => `${(i / (points.length - 1)) * W},${H - ((p - lo) / (hi - lo || 1)) * H}`).join(" ");
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden><polyline points={xy} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/**
 * 학부모 첫 화면 — 자녀를 고르고, 그 자녀가 듣는 강좌(강사 상관없이)를 강좌별로.
 * courseHref 로 강좌 리포트 주소를 정한다 (로그인 화면과 문자 링크 화면이 같이 쓴다).
 */
export function ParentFamily({
  kids, child, courses, childHref, courseHref, linkExpires, preview,
}: {
  kids: ChildRef[]; child: ChildRef; courses: ChildCourse[];
  childHref?: (id: string) => string; courseHref: (classId: string) => string;
  linkExpires?: string; preview?: boolean;
}) {
  return (
    <div className="flex min-h-dvh w-full min-w-0 justify-center bg-white sm:bg-grey-100">
      <div className="flex min-h-dvh w-full min-w-0 max-w-md flex-col border-grey-200 bg-white pb-10 sm:border-x">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-grey-100 bg-white/95 px-5 pb-3 pt-5 backdrop-blur-sm">
          <div className="leading-tight">
            <div className="text-[17px] font-bold text-grey-900">세정학원</div>
            <div className="text-[12px] text-grey-500">{linkExpires ? "학습 리포트" : "학부모"}</div>
          </div>
          {linkExpires ? <Badge tone="blue">학습 리포트</Badge> : <ButtonLink href="/account" variant="secondary" size="xs">내 계정</ButtonLink>}
        </header>
        {preview && <div className="bg-amber-50 px-5 py-2 text-[12.5px] font-medium text-amber-500">운영진 미리보기 · 학부모 화면이에요.</div>}

        <main className="flex-1 space-y-3 px-5 pt-3">
          {kids.length > 1 && childHref && (
            <ChipTabs active={child.id} items={kids.map((k) => ({ key: k.id, label: k.name, href: childHref(k.id) }))} />
          )}

          <div className="px-1 pt-2">
            <h2 className="text-[20px] font-bold text-grey-900">{child.name}</h2>
            <p className="text-[13px] text-grey-500">{[child.school, child.grade].filter(Boolean).join(" · ")} · 수강 {courses.length}개</p>
          </div>

          {courses.length === 0 ? (
            <Card className="py-12 text-center text-[14px] text-grey-500">수강 중인 강좌가 없어요</Card>
          ) : (
            courses.map((c) => (
              <Link key={c.id} href={courseHref(c.id)} className="pressable block rounded-card border border-grey-200 bg-white p-4 transition-colors hover:bg-grey-50">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] text-[15px] font-bold text-white" style={{ backgroundColor: c.space.accent_color }}>
                    {c.space.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-bold text-grey-900">{c.title}</div>
                    <div className="num truncate text-[12.5px] text-grey-500">
                      {c.space.name} · {c.slots.map((s) => `${s.weekday} ${s.start_time}`).join(" · ") || "시간 미정"}
                    </div>
                  </div>
                  <Spark points={c.trend} color={c.space.accent_color} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-panel py-2">
                    <div className="text-[11.5px] text-grey-500">출석</div>
                    <div className="num text-[14px] font-bold text-grey-900">{c.attendance.total ? `${c.attendance.ok}/${c.attendance.total}` : "—"}</div>
                  </div>
                  <div className="rounded-md bg-panel py-2">
                    <div className="text-[11.5px] text-grey-500">숙제</div>
                    <div className="num text-[14px] font-bold text-grey-900">{c.homework.total ? `${c.homework.done}/${c.homework.total}` : "—"}</div>
                  </div>
                  <div className="rounded-md bg-panel py-2">
                    <div className="text-[11.5px] text-grey-500">최근 테스트</div>
                    <div className="num text-[14px] font-bold text-grey-900">{c.lastTest ? `${c.lastTest.pct}점` : "—"}</div>
                  </div>
                </div>
                {c.next && <div className="num mt-2 text-[12.5px] text-grey-600">다음 수업 {when(c.next)}</div>}
              </Link>
            ))
          )}

          {linkExpires && (
            <p className="px-1 pt-4 text-center text-[12px] leading-[1.6] text-grey-400">
              이 링크는 {linkExpires}까지 열 수 있어요. 문의는 담당 선생님께 해 주세요.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
