import Link from "next/link";
import type { CourseCard } from "@/lib/course";
import { Badge } from "@/components/ui/Card";
import { cardBase } from "./ui";

const when = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" });

/** 강사 앱 첫 화면의 강좌 카드 — 눌러서 그 강좌로 들어간다 */
export function CourseCards({ slug, courses, accent }: { slug: string; courses: CourseCard[]; accent: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((c) => (
        <Link key={c.id} href={`/s/${slug}/c/${c.id}`}
          className={`${cardBase} pressable group flex flex-col p-5 transition-colors hover:border-blue-300`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Badge tone={c.kind === "special" ? "amber" : "blue"}>{c.kind === "special" ? "특강" : "정규"}</Badge>
                {c.isClosed && <Badge>종강</Badge>}
              </div>
              <div className="mt-2 truncate text-[17px] font-bold text-grey-900 group-hover:text-blue-600">{c.title}</div>
              <div className="num mt-0.5 truncate text-[13px] text-grey-500">
                {c.slots.length ? c.slots.map((s) => `${s.weekday} ${s.start_time}`).join(" · ") : "시간 미배치"}
                {c.slots[0]?.room_name ? ` · ${c.slots[0].room_name}` : ""}
              </div>
            </div>
            <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-panel py-2">
              <div className="text-[11.5px] text-grey-500">수강생</div>
              <div className="num text-[15px] font-bold text-grey-900">{c.students}{c.capacity ? <span className="text-[12px] font-medium text-grey-400">/{c.capacity}</span> : null}</div>
            </div>
            <div className="rounded-md bg-panel py-2">
              <div className="text-[11.5px] text-grey-500">진도</div>
              <div className="num text-[15px] font-bold text-grey-900">{c.done}<span className="text-[12px] font-medium text-grey-400">/{c.totalSessions}회</span></div>
            </div>
            <div className="rounded-md bg-panel py-2">
              <div className="text-[11.5px] text-grey-500">최근 평균</div>
              <div className="num text-[15px] font-bold text-grey-900">{c.lastExam ? `${c.lastExam.avg}점` : "—"}</div>
            </div>
          </div>

          <div className="mt-3 space-y-1 text-[12.5px]">
            <div className="text-grey-600">{c.next ? <>다음 수업 <b className="num font-semibold text-grey-800">{when(c.next.at)}</b>{c.next.no ? ` · ${c.next.no}회차` : ""}</> : "남은 수업 없음"}</div>
            <div className="flex items-center justify-between">
              <span className={c.assistants.length ? "text-grey-600" : "text-amber-500"}>
                {c.assistants.length ? `조교 ${c.assistants.join(", ")}` : "조교 미배정"}
              </span>
              {c.openTodos > 0 && <span className="font-semibold text-red-500">할 일 {c.openTodos}</span>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
