import Link from "next/link";
import type { ClassRow } from "@/lib/hq";
import { Badge } from "@/components/ui/Card";

const won = (n: number | null) => (n == null ? "—" : n.toLocaleString("ko-KR"));
const day = (d: string | null) => (d ? d.slice(2).replace(/-/g, ".") : "—");

/** ERP 강좌 목록과 같은 열 — 개강일 · 강사 · 과목 · 강좌명 · 구분 · 요일·시간 · 강의실 · 등록/정원 · 수강료 */
export function ClassTable({ rows, showTeacher, hrefOf }: { rows: ClassRow[]; showTeacher?: boolean; hrefOf: (r: ClassRow) => string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px]">
        <thead className="border-b border-grey-100">
          <tr className="text-left text-[12.5px] font-semibold text-grey-600">
            <th className="px-4 py-2.5">개강일</th>
            {showTeacher && <th className="px-3 py-2.5">강사</th>}
            <th className="px-3 py-2.5">과목</th><th className="px-3 py-2.5">강좌명</th><th className="px-3 py-2.5">구분</th>
            <th className="px-3 py-2.5">수업 요일·시간</th><th className="px-3 py-2.5">강의실</th>
            <th className="px-3 py-2.5 text-right">등록/정원</th><th className="px-3 py-2.5 text-right">수강료</th>
            <th className="px-4 py-2.5">조교</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-100 text-[13.5px]">
          {rows.map((r) => (
            <tr key={r.id} className="relative align-top transition-colors hover:bg-grey-50">
              <td className="num whitespace-nowrap px-4 py-3 text-grey-600">{day(r.startsOn)}</td>
              {showTeacher && <td className="whitespace-nowrap px-3 py-3 text-grey-800">{r.teacherName}</td>}
              <td className="px-3 py-3"><Badge>{r.subject ?? "—"}</Badge></td>
              <td className="max-w-[360px] px-3 py-3">
                <Link href={hrefOf(r)} className="font-semibold text-grey-900 after:absolute after:inset-0">{r.title}</Link>
                {r.isClosed && <Badge tone="grey" className="ml-1.5">종강</Badge>}
              </td>
              <td className="px-3 py-3"><Badge tone={r.kind === "special" ? "amber" : "blue"}>{r.kind === "special" ? "특강" : "정규"}</Badge></td>
              <td className="num whitespace-nowrap px-3 py-3 text-grey-700">
                {r.slots.length ? r.slots.map((s, i) => <div key={i}>{s.weekday} {s.start_time}–{s.end_time}</div>) : <span className="text-grey-400">미배치</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-grey-600">
                {[...new Set(r.slots.map((s) => s.room_name).filter(Boolean))].join(", ") || "—"}
              </td>
              <td className="num whitespace-nowrap px-3 py-3 text-right text-grey-800">{r.enrolled} / {r.capacity ?? "—"}</td>
              <td className="num whitespace-nowrap px-3 py-3 text-right">
                <div className="font-semibold text-grey-900">{won(r.pricePerSession != null && r.totalSessions != null ? r.pricePerSession * r.totalSessions : null)}</div>
                {r.pricePerSession != null && <div className="text-[12px] text-grey-500">{won(r.pricePerSession)} × {r.totalSessions ?? "—"}회</div>}
              </td>
              <td className="px-4 py-3">{r.assistants ? <span className="text-grey-700">{r.assistants}명</span> : <span className="text-[12.5px] text-amber-500">미배정</span>}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={showTeacher ? 10 : 9} className="py-16 text-center text-grey-400">조건에 맞는 강좌가 없어요</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
