/**
 * 밀도 높은 표 — 대치온 수강생 목록이 기준.
 *
 * 학원 관리자 화면의 표는 한 화면에 40행 이상이 보여야 쓸모가 있다.
 * 그래서 행 높이 44px, 글자 13.5px, 경계선은 --line-2(grey-100) 로 최대한 얇게.
 * 머리행은 sticky — 스크롤해도 어느 열인지 잃지 않는다.
 */

export function TableWrap({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto rounded-card border border-grey-200 bg-white ${className}`}>
      <table className="w-full min-w-max border-collapse text-left">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 z-[1] bg-white [&_tr]:border-b [&_tr]:border-grey-200">
      {children}
    </thead>
  );
}

export function Th({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-3 py-2.5 text-[12.5px] font-semibold text-grey-600 ${a} ${className}`}
    >
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="[&_tr]:border-b [&_tr]:border-grey-100 [&_tr:last-child]:border-0">
      {children}
    </tbody>
  );
}

export function Tr({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tr className={`transition-colors hover:bg-grey-50 ${className}`}>{children}</tr>;
}

export function Td({
  children,
  align = "left",
  strong = false,
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  /** 이름·점수처럼 그 행의 주인공인 값 */
  strong?: boolean;
  className?: string;
}) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <td
      className={`h-11 px-3 text-[13.5px] ${a} ${strong ? "font-semibold text-grey-900" : "text-grey-700"} ${className}`}
    >
      {children}
    </td>
  );
}

/** 빈 표 — 열 수를 넘겨 가운데 정렬 */
export function TableEmpty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-16 text-center text-[13.5px] text-grey-400">
        {children}
      </td>
    </tr>
  );
}
