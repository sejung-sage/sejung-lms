import Link from "next/link";
import type { SpaceDetail } from "@/lib/spaces";
import type { ParentHome as ParentHomeData } from "@/lib/parent";
import { LineChart } from "@/components/student/charts";
import { Card, Badge } from "@/components/ui/Card";
import { ChipTabs } from "@/components/ui/Tabs";
import { ButtonLink } from "@/components/ui/Button";

/**
 * linkExpires 가 있으면 '알림톡·문자 링크로 연 리포트' — 로그인 없이 열리므로 계정·알림 버튼과 자녀 전환을 뺀다.
 */
export function ParentHome({
  space, slug, data, preview, linkExpires, course, backHref,
}: {
  space: SpaceDetail; slug: string; data: ParentHomeData; preview?: boolean; linkExpires?: string;
  /** 강좌 리포트면 그 강좌 이름 — 자녀 전환 대신 강좌 이름이 머리에 온다 */
  course?: string;
  /** 자녀의 강좌 목록으로 돌아가기 */
  backHref?: string;
}) {
  const accent = space.accent_color;
  const initial = space.name.replace(/쌤$/, "").charAt(0) || space.name.charAt(0);

  return (
    <div className="flex min-h-dvh w-full min-w-0 justify-center bg-white sm:bg-grey-100">
      <div className="flex min-h-dvh w-full min-w-0 max-w-md flex-col border-grey-200 bg-white pb-10 sm:border-x">
      {/* 상단바 */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-grey-100 bg-white/95 px-5 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          {backHref && (
            <Link href={backHref} aria-label="강좌 목록으로" className="-ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-grey-600 hover:bg-grey-100">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </Link>
          )}
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-[12px] text-[14px] font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            {initial}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[17px] font-bold text-grey-900">{course ?? space.name}</div>
            <div className="truncate text-[12px] text-grey-500">{course ? `${space.name} · ${space.subject ?? ""}` : `${space.subject} · 학부모`}</div>
          </div>
        </div>
        {linkExpires ? (
          <Badge tone="blue">학습 리포트</Badge>
        ) : (
        <div className="flex items-center gap-1.5">
          <ButtonLink href={preview ? `/s/${slug}` : "/account"} variant="secondary" size="xs">
            {preview ? "관리자 뷰" : "내 계정"}
          </ButtonLink>
          <Link
            href="/"
            aria-label="알림"
            className="flex size-9 items-center justify-center rounded-full bg-grey-100 text-grey-600 transition-colors hover:bg-grey-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
              <path d="M10.3 20a2 2 0 0 0 3.4 0" />
            </svg>
          </Link>
        </div>
        )}
      </header>
      {preview && (
        <div className="bg-amber-50 px-5 py-2 text-[12.5px] font-medium text-amber-500">
          운영진 미리보기 · 이 공간 첫 학생의 학부모 화면이에요.
        </div>
      )}

      <main className="flex-1 space-y-3 px-5 pt-1">
        {/* 자녀 스위처 — 링크 리포트는 한 학생 전용 */}
        {!linkExpires && !course && (
          <ChipTabs
            active={data.child}
            items={data.children.map((c) => ({ key: c, label: c }))}
          />
        )}

        {/* 이번 주 요약 */}
        <h3 className="px-1 pb-1 pt-3 text-[17px] font-bold text-grey-900">
          {data.child} · 이번 주 요약
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { l: "출결", v: data.weekSummary.attendance },
            { l: "숙제", v: data.weekSummary.homework },
            { l: "테스트", v: data.weekSummary.test },
          ].map((s) => (
            <Card key={s.l} className="p-4 text-center">
              <div className="text-[12px] font-medium text-grey-500">{s.l}</div>
              <div className="num mt-1 text-[16px] font-bold text-grey-900">{s.v}</div>
            </Card>
          ))}
        </div>

        {/* 성적 추이 */}
        <h3 className="px-1 pb-1 pt-3 text-[17px] font-bold text-grey-900">성적 추이</h3>
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <span className="num text-[13px] text-grey-500">
              {data.recentScore.label} {data.recentScore.score}점
            </span>
            <Badge tone="blue">상위 {data.recentScore.percentile}%</Badge>
          </div>
          <LineChart points={data.examTrend.points} labels={data.examTrend.labels} />
        </Card>

        {/* 성장 기록 */}
        <h3 className="px-1 pb-1 pt-3 text-[17px] font-bold text-grey-900">성장 기록</h3>
        <Card>
          <ul className="relative space-y-5 before:absolute before:left-[4px] before:top-1.5 before:h-[calc(100%-1.5rem)] before:w-px before:bg-grey-200">
            {data.growth.map((g, i) => (
              <li key={i} className="relative pl-6">
                <span
                  className={`absolute left-0 top-1.5 size-2.5 rounded-full ring-4 ring-white ${
                    g.kind === "good" ? "bg-blue-500" : "bg-red-500"
                  }`}
                />
                <div className="text-[14px] leading-[1.5] text-grey-800">{g.text}</div>
                <div className="num mt-0.5 text-[12px] text-grey-400">{g.date}</div>
              </li>
            ))}
          </ul>
        </Card>

        {/* 알림 */}
        <h3 className="px-1 pb-1 pt-3 text-[17px] font-bold text-grey-900">알림</h3>
        <Card padded={false}>
          <ul className="divide-y divide-grey-100">
            {data.alerts.map((a, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-grey-100 text-[15px]">
                  {a.icon}
                </span>
                <span className="flex-1 text-[14px] text-grey-700">{a.text}</span>
                <span className="num shrink-0 text-[12px] text-grey-400">{a.at}</span>
              </li>
            ))}
          </ul>
        </Card>
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
