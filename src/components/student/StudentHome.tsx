import type { StudentHome as StudentHomeData } from "@/lib/student";
import type { SpaceDetail } from "@/lib/spaces";
import { QrGlyph } from "./QrGlyph";
import { StudentFrame } from "./StudentFrame";
import { Button } from "@/components/ui/Button";
import { Card, Badge } from "@/components/ui/Card";
import { OmrEntry } from "@/components/omr/OmrEntry";

/** 토스식 체크: 완료면 파란 원 + 흰 체크, 아니면 회색 테두리 원 */
function CheckCircle({ done }: { done: boolean }) {
  return (
    <span
      className={`flex size-[22px] shrink-0 items-center justify-center rounded-full transition-colors ${
        done ? "bg-blue-500 text-white" : "border-[1.5px] border-grey-300 bg-white"
      }`}
    >
      {done && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

function SectionHeading({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between px-1 pb-1 pt-3">
      <h3 className="text-[17px] font-bold text-grey-900">{children}</h3>
      {right && <span className="text-[13px] text-grey-500">{right}</span>}
    </div>
  );
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-[14px] text-grey-500">{label}</span>
    <span className="text-[14px] font-medium text-grey-800">{value}</span>
  </div>
);

export function StudentHome({ space, slug, data, preview }: { space: SpaceDetail; slug: string; data: StudentHomeData; preview?: boolean }) {
  const w = data.thisWeek;
  const doneCount = data.todos.filter((h) => h.done).length;

  return (
    <StudentFrame space={space} slug={slug} active="home" preview={preview}>
      {/* 오늘/이번 주 수업 — 토스 메인 카드처럼 흰 배경 + 큰 볼드 + 파란 CTA 하나 */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge tone="blue">{w.tag}</Badge>
            <h2 className="mt-2 text-[22px] font-bold leading-tight tracking-[-0.03em] text-grey-900">
              {w.title}
            </h2>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-grey-50">
            <QrGlyph />
          </div>
        </div>

        <div className="mt-4 divide-y divide-grey-100 border-t border-grey-100 pt-1">
          <InfoRow label="수업" value={w.className} />
          <InfoRow label="장소" value={w.location} />
          <InfoRow label="일정" value={`${w.week} · ${w.time}`} />
        </div>

        <Button variant="primary" size="lg" fullWidth className="mt-4">
          등원 QR 스캔하기
        </Button>
      </Card>

      <OmrEntry slug={slug} />

      {/* 이번 주 현황 */}
      <SectionHeading>이번 주 현황</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-[13px] font-medium text-grey-600">과제 수행</div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="num text-[28px] font-bold tracking-[-0.03em] text-grey-900">
              {data.assignmentGrade.grade}
            </span>
            <span className="text-[13px] text-grey-500">등급</span>
          </div>
          <div className="mt-1 text-[12px] text-grey-500">{data.assignmentGrade.desc}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-grey-600">{data.test.round}</span>
            <Badge tone="blue">상위 {data.test.percentile}%</Badge>
          </div>
          <div className="mt-1.5 flex items-baseline gap-0.5">
            <span className="num text-[28px] font-bold tracking-[-0.03em] text-grey-900">
              {data.test.score}
            </span>
            <span className="num text-[14px] text-grey-500">/ {data.test.max}점</span>
          </div>
          <div className="num mt-1 text-[12px] text-grey-500">반평균 {data.test.classAvg}점</div>
        </Card>
      </div>

      {/* 오늘 할 일 */}
      <SectionHeading right={`${doneCount}/${data.todos.length} 완료`}>오늘 할 일</SectionHeading>
      <Card padded={false}>
        <ul className="divide-y divide-grey-100">
          {data.todos.map((h, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <CheckCircle done={h.done} />
                <div className="min-w-0">
                  <div
                    className={`truncate text-[15px] font-semibold ${
                      h.done ? "text-grey-400 line-through" : "text-grey-900"
                    }`}
                  >
                    {h.title}
                  </div>
                  <div className="truncate text-[13px] text-grey-500">{h.sub}</div>
                </div>
              </div>
              {!h.done && (
                <Button variant="weak" size="sm">
                  제출
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {/* 공지 */}
      <SectionHeading>공지</SectionHeading>
      <Card>
        <div className="text-[16px] font-bold text-grey-900">{data.notice.title}</div>
        <p className="mt-1.5 text-[14px] leading-[1.6] text-grey-600">{data.notice.body}</p>
        <div className="mt-3 flex items-center gap-1.5 text-[12px] text-grey-400">
          <span>{data.notice.teacher}</span>
          <span>·</span>
          <span className="num">{data.notice.date}</span>
        </div>
      </Card>
    </StudentFrame>
  );
}
