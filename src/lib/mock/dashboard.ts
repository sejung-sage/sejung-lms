// 세정 LMS — TD 선생님 대시보드 목 데이터.
// PRD 14p/15p 위젯 기준. USE_MOCK_DB=true 일 때 사용.

export type Dashboard = {
  studentCount: number;
  todaySessions: { time: string; title: string; status: "예정" | "진행중" | "완료" }[];
  missingHomework: { student: string; assignment: string; daysLate: number }[];
  gradeSummary: { label: string; value: number; unit: "점" | "%" }[];
  clinics: { student: string; reason: string; status: "신청" | "승인" | "완료" }[];
  notices: { title: string; date: string }[];
  approvals: { student: string; info: string; channel: string; at: string }[];
};

// 과목별 성적 항목 라벨 (PRD 15p GLORIA: 단어/문법/숙제완성도)
const GRADE_LABELS: Record<string, string[]> = {
  영어: ["단어시험", "문법", "독해"],
  수학: ["개념테스트", "계산", "모의고사"],
  국어: ["문학", "문법", "독서"],
  화학: ["개념", "계산", "실전"],
};

// 결정적(deterministic) 의사난수 — slug 기반, 새로고침해도 동일
function seeded(slug: string) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) % 100000;
  return (min: number, max: number) => min + (h = (h * 1103515245 + 12345) % 100000) % (max - min + 1);
}

export function mockDashboard(space: { name: string; subject: string | null; slug: string | null }): Dashboard {
  const rnd = seeded(space.slug ?? space.name);
  const labels = GRADE_LABELS[space.subject ?? ""] ?? ["시험A", "시험B", "숙제완성도"];

  return {
    studentCount: rnd(28, 64),
    todaySessions: [
      { time: "16:00", title: `${space.subject ?? ""} 정규 A반`, status: "완료" },
      { time: "18:00", title: `${space.subject ?? ""} 정규 B반`, status: "진행중" },
      { time: "20:00", title: "심화 클리닉", status: "예정" },
    ],
    missingHomework: [
      { student: "김도윤", assignment: "9회차 단어 100", daysLate: 2 },
      { student: "이서준", assignment: "9회차 문제풀이", daysLate: 2 },
      { student: "박하은", assignment: "8회차 오답노트", daysLate: 5 },
      { student: "최지우", assignment: "9회차 단어 100", daysLate: 1 },
    ],
    gradeSummary: [
      { label: labels[0], value: rnd(55, 78), unit: "점" },
      { label: labels[1], value: rnd(18, 40), unit: "점" },
      { label: labels[2] ?? "숙제완성도", value: rnd(78, 100), unit: "%" },
    ],
    clinics: [
      { student: "정민서", reason: "9회차 문법 보강", status: "신청" },
      { student: "강하람", reason: "모의고사 오답", status: "승인" },
      { student: "윤채원", reason: "결석 보강", status: "완료" },
    ],
    notices: [
      { title: "이번 주 토요일 9시 정규수업 안내", date: "07-04" },
      { title: "9회차 단어시험 범위 공지", date: "07-02" },
      { title: "7월 클리닉 신청 오픈", date: "07-01" },
    ],
    approvals: [
      { student: "정예진", info: "앱 예약 · 주관식 재시험", channel: "앱", at: "07-01 10:35" },
      { student: "한지호", info: "신규 가입 승인 대기", channel: "앱", at: "07-01 09:12" },
    ],
  };
}
