"use client";

import { useActionState, useState } from "react";
import { createReportLink, type ReportLinkState } from "@/lib/report-actions";
import type { ReportTarget } from "@/lib/report-links";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";

const initial: ReportLinkState = { ok: false, message: "" };

const smsBody = (name: string, url: string) =>
  `[세정학원] ${name} 학생의 학습 리포트가 도착했어요. 아래 링크에서 출결·성적·과제를 확인해 주세요.\n${url}`;

function Row({ slug, r }: { slug: string; r: ReportTarget }) {
  const [state, action, pending] = useActionState(createReportLink.bind(null, slug, r.studentId), initial);
  const [copied, setCopied] = useState(false);
  const phone = (r.parentPhone ?? "").replace(/\D/g, "");

  return (
    <tr className="align-top text-[13.5px]">
      <td className="h-12 px-4 py-3 font-semibold text-grey-900">{r.name}</td>
      <td className="px-3 py-3 text-grey-700">
        {r.parentPhone ? (
          <>
            <div className="num">{r.parentPhone}</div>
            <div className="text-[12px] text-grey-500">{r.parentName}</div>
          </>
        ) : (
          <span className="text-[12.5px] text-grey-400">보호자 번호 없음</span>
        )}
      </td>
      <td className="px-3 py-3">
        {r.last ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="num text-grey-600">{r.last.createdAt.slice(5, 10).replace("-", ".")} 발송</span>
            {r.last.views > 0 ? <Badge tone="green">열람 {r.last.views}회</Badge> : <Badge tone="grey">미열람</Badge>}
          </div>
        ) : (
          <span className="text-grey-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {state.url ? (
          <div className="ml-auto flex max-w-[360px] flex-col items-end gap-1.5">
            <div className="w-full truncate rounded-sm bg-panel px-2.5 py-1.5 text-left font-mono text-[12px] text-grey-700">{state.url}</div>
            <div className="flex gap-1.5">
              {phone && (
                <a
                  href={`sms:${phone}?&body=${encodeURIComponent(smsBody(r.name, state.url))}`}
                  className="inline-flex h-8 items-center rounded-sm bg-blue-500 px-3 text-[13px] font-semibold text-white hover:bg-blue-600"
                >
                  문자로 보내기
                </a>
              )}
              <Button
                variant="secondary" size="xs"
                onClick={async () => { await navigator.clipboard.writeText(smsBody(r.name, state.url!)); setCopied(true); }}
              >
                {copied ? "복사됨" : "문구 복사"}
              </Button>
              <a href={state.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center px-2 text-[13px] font-semibold text-grey-500 hover:text-grey-900">
                열어보기
              </a>
            </div>
          </div>
        ) : (
          <form action={action}>
            <Button type="submit" variant="weak" size="xs" disabled={pending}>
              {pending ? "만드는 중…" : r.last ? "새 링크 보내기" : "리포트 링크 보내기"}
            </Button>
            {!state.ok && state.message && <p className="mt-1 text-[12px] text-red-500">{state.message}</p>}
          </form>
        )}
      </td>
    </tr>
  );
}

/**
 * 학부모 리포트 링크.
 * 알림톡 발송 연동 전이라, 링크를 만든 뒤 '문자로 보내기'(휴대폰 문자앱이 열림)나 '문구 복사'로 전달한다.
 * 링크는 로그인 없이 그 학생의 리포트만 열리고 14일 뒤 만료된다.
 */
export function ReportLinkPanel({ slug, rows }: { slug: string; rows: ReportTarget[] }) {
  return (
    <div className="rounded-card border border-grey-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-grey-200 px-4 py-3">
        <span className="text-[15px] font-bold text-grey-900">학부모 리포트 링크</span>
        <span className="text-[13px] text-grey-500">· 보호자 번호로 보내면 로그인 없이 자녀 리포트가 열려요 (14일 유효)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-grey-100">
            <tr className="text-left text-[12.5px] font-semibold text-grey-600">
              <th className="px-4 py-2.5">학생</th><th className="px-3 py-2.5">보호자 번호</th>
              <th className="px-3 py-2.5">최근 발송</th><th className="px-4 py-2.5 text-right">보내기</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-100">
            {rows.map((r) => <Row key={r.studentId} slug={slug} r={r} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
