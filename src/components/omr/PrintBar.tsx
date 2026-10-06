"use client";

import { Button, ButtonLink } from "@/components/ui/Button";

/** 인쇄 화면 상단 막대 — 인쇄할 때는 숨는다 */
export function PrintBar({ backHref, title, disabled }: { backHref: string; title: string; disabled?: boolean }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-grey-200 bg-white px-5 py-3 print:hidden">
      <div className="flex items-center gap-3">
        <ButtonLink href={backHref} variant="ghost" size="sm">돌아가기</ButtonLink>
        <span className="text-[15px] font-bold text-grey-900">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-[12.5px] text-grey-500 sm:inline">인쇄 설정: A4 · 배율 100% · 여백 없음</span>
        <Button variant="primary" size="sm" disabled={disabled} onClick={() => window.print()}>
          인쇄
        </Button>
      </div>
    </div>
  );
}
