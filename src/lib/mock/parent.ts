// 세정 LMS — 학부모 앱 홈 목 데이터. PRD 4.3 (읽기전용 보호자 뷰).

export type ParentHome = {
  children: string[];
  child: string;
  weekSummary: { attendance: string; homework: string; test: string };
  examTrend: { labels: string[]; points: number[] };
  recentScore: { label: string; score: number; percentile: number };
  growth: { date: string; text: string; kind: "good" | "care" }[];
  alerts: { icon: string; text: string; at: string }[];
};

export function mockParentHome(space: { name: string; subject: string | null }): ParentHome {
  const subject = space.subject ?? "정규";
  return {
    children: ["이서준", "이서윤"],
    child: "이서준",
    weekSummary: { attendance: "출석 완료", homework: "2/3 완료", test: "28 / 30점" },
    examTrend: {
      labels: ["3회", "4회", "5회", "6회", "7회", "8회", "9회"],
      points: [78, 84, 80, 93, 90, 95, 89],
    },
    recentScore: { label: `${subject} 8주차`, score: 82, percentile: 12 },
    growth: [
      { date: "06-28", text: `${subject} 단어시험 만점 — 꾸준함이 좋아요`, kind: "good" },
      { date: "06-21", text: "문법 취약 파트 클리닉 배정 후 향상", kind: "care" },
      { date: "06-14", text: "모의고사 반 상위 15% 진입", kind: "good" },
    ],
    alerts: [
      { icon: "📊", text: `${subject} 8주차 성적이 등록되었습니다`, at: "1시간 전" },
      { icon: "📝", text: "이번 주 숙제 1건이 미제출 상태입니다", at: "어제" },
      { icon: "✅", text: "7회차 정규수업 출석 확인", at: "3일 전" },
    ],
  };
}
