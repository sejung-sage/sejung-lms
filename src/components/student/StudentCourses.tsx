import Link from "next/link";
import type { SpaceDetail } from "@/lib/spaces";
import type { StudentCourse } from "@/lib/student";
import { StudentFrame } from "./StudentFrame";
import { Card, Badge } from "@/components/ui/Card";

const when = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" });

/** 학생 앱 첫 화면 — 이 선생님에게서 듣는 내 강좌. 눌러서 들어간다 */
export function StudentCourses({
  space, slug, courses, todos, preview,
}: {
  space: SpaceDetail; slug: string; courses: StudentCourse[];
  todos: { title: string; sub: string; course: string | null }[]; preview?: boolean;
}) {
  return (
    <StudentFrame space={space} slug={slug} active="home" preview={preview}>
      <h3 className="px-1 pb-1 pt-2 text-[17px] font-bold text-grey-900">내 강좌</h3>
      {courses.length === 0 ? (
        <Card className="py-12 text-center text-[14px] text-grey-500">아직 듣는 강좌가 없어요</Card>
      ) : (
        <div className="space-y-2.5">
          {courses.map((c) => (
            <Link key={c.id} href={`/s/${slug}/student/c/${c.id}`}
              className="pressable block rounded-card border border-grey-200 bg-white p-4 transition-colors hover:bg-grey-50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Badge tone={c.kind === "special" ? "amber" : "blue"}>{c.kind === "special" ? "특강" : "정규"}</Badge>
                  <div className="mt-1.5 truncate text-[17px] font-bold text-grey-900">{c.title}</div>
                  <div className="num mt-0.5 text-[13px] text-grey-500">
                    {c.slots.map((s) => `${s.weekday} ${s.start_time}`).join(" · ") || "시간 미정"}
                    {c.slots[0]?.room_name ? ` · ${c.slots[0].room_name}` : ""}
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-6 shrink-0 text-grey-400"><path d="m9 6 6 6-6 6" /></svg>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-panel py-2">
                  <div className="text-[11.5px] text-grey-500">다음 수업</div>
                  <div className="num text-[13px] font-bold text-grey-900">{c.next ? when(c.next) : "—"}</div>
                </div>
                <div className="rounded-md bg-panel py-2">
                  <div className="text-[11.5px] text-grey-500">최근 테스트</div>
                  <div className="num text-[13px] font-bold text-grey-900">{c.lastTest ? `${c.lastTest.score}/${c.lastTest.max}` : "—"}</div>
                </div>
                <div className="rounded-md bg-panel py-2">
                  <div className="text-[11.5px] text-grey-500">숙제</div>
                  <div className="num text-[13px] font-bold text-grey-900">{c.homework.total ? `${c.homework.done}/${c.homework.total}` : "—"}</div>
                </div>
              </div>
              {c.openTodos > 0 && <div className="mt-2 text-[12.5px] font-semibold text-red-500">할 일 {c.openTodos}개</div>}
            </Link>
          ))}
        </div>
      )}

      <h3 className="px-1 pb-1 pt-4 text-[17px] font-bold text-grey-900">오늘 할 일</h3>
      <Card padded={false}>
        {todos.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-grey-400">남은 할 일이 없어요</p>
        ) : (
          <ul className="divide-y divide-grey-100">
            {todos.map((t, i) => (
              <li key={i} className="px-4 py-3">
                <div className="truncate text-[14.5px] font-semibold text-grey-900">{t.title}</div>
                <div className="text-[12.5px] text-grey-500">{t.course ? `${t.course} · ` : ""}{t.sub}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </StudentFrame>
  );
}
