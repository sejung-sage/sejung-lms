import Link from "next/link";
import type { Branch } from "@/lib/hq";

const sel = "h-9 rounded-sm border border-grey-200 bg-white px-2.5 text-[13.5px] text-grey-800 outline-none focus:border-blue-500";
const SUBJECTS = ["국어", "수학", "영어", "과탐", "사탐", "한국사", "제2외국어", "논술", "컨설팅", "기타"];

export type ClassParams = { branch?: string; subject?: string; kind?: string; q?: string; closed?: string; page?: string };

/** GET 폼 — 자바스크립트 없이도 동작하고, 주소를 그대로 공유할 수 있다 */
export function ClassFilters({ params, branches, base }: { params: ClassParams; branches?: Branch[]; base: string }) {
  return (
    <form method="get" action={base} className="flex flex-wrap items-center gap-2 border-b border-grey-200 px-4 py-3">
      {branches && (
        <select name="branch" defaultValue={params.branch ?? ""} aria-label="지점" className={sel}>
          <option value="">전체 지점</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}
      <select name="subject" defaultValue={params.subject ?? ""} aria-label="과목" className={sel}>
        <option value="">전체 과목</option>
        {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
      </select>
      <select name="kind" defaultValue={params.kind ?? ""} aria-label="구분" className={sel}>
        <option value="">전체 구분</option><option value="regular">정규</option><option value="special">특강</option>
      </select>
      <label className="flex h-9 items-center gap-1.5 px-1 text-[13.5px] text-grey-700">
        <input type="checkbox" name="closed" value="1" defaultChecked={params.closed === "1"} className="size-4 accent-blue-500" /> 종강 포함
      </label>
      <input name="q" defaultValue={params.q ?? ""} placeholder="강좌명 검색" aria-label="강좌명 검색" className={`${sel} w-full max-w-[240px]`} />
      <button type="submit" className="h-9 rounded-sm bg-grey-900 px-3.5 text-[13px] font-semibold text-white">조회</button>
      <Link href={base} className="h-9 px-2 text-[13px] font-semibold leading-9 text-grey-500 hover:text-grey-900">초기화</Link>
    </form>
  );
}

export function Pager({ total, page, size, base, params }: { total: number; page: number; size: number; base: string; params: ClassParams }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const href = (p: number) => {
    const sp = new URLSearchParams(Object.entries({ ...params, page: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `${base}?${sp}`;
  };
  return (
    <div className="flex items-center justify-between border-t border-grey-100 px-4 py-2.5 text-[12.5px] text-grey-500">
      <span>총 {total.toLocaleString("ko-KR")}개 · {page}/{pages}쪽</span>
      <div className="flex gap-1.5">
        {page > 1 && <Link href={href(page - 1)} className="rounded-sm bg-grey-100 px-3 py-1.5 font-semibold text-grey-700 hover:bg-grey-200">이전</Link>}
        {page < pages && <Link href={href(page + 1)} className="rounded-sm bg-grey-100 px-3 py-1.5 font-semibold text-grey-700 hover:bg-grey-200">다음</Link>}
      </div>
    </div>
  );
}
