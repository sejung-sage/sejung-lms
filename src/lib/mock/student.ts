// 세정 LMS — SA 학생앱 홈 목 데이터. PRD 13·14p 기준.

export type StudentHome = {
  studentName: string;
  thisWeek: {
    tag: string;
    title: string; // 이번 주 진도
    className: string;
    location: string;
    week: string;
    time: string;
  };
  assignmentGrade: { grade: string; desc: string };
  test: { round: string; score: number; max: number; percentile: number; classAvg: number };
  homework: { title: string; sub: string; done: boolean }[];
  notice: { title: string; body: string; teacher: string; date: string };
};

// 과목별 이번 주 진도 타이틀
const PROGRESS: Record<string, string> = {
  영어: "관계대명사 · 독해 추론",
  수학: "미분계수와 도함수",
  국어: "현대시 · 화자의 정서",
  화학: "산화·환원 반응",
};

export function mockStudentHome(space: {
  name: string;
  subject: string | null;
  slug: string | null;
}): StudentHome {
  const subject = space.subject ?? "정규";
  return {
    studentName: "이서준",
    thisWeek: {
      tag: "정규수업",
      title: `이번 주 진도 · ${PROGRESS[subject] ?? "핵심 개념 정리"}`,
      className: `${subject} 7회차`,
      location: "세정학원 대치 3층 A강의실",
      week: "7주차",
      time: "토 18:00 ~ 21:00",
    },
    assignmentGrade: { grade: "A", desc: "숙제 완성도 95~100%" },
    test: { round: "7회차 테스트", score: 28, max: 30, percentile: 12, classAvg: 24 },
    homework: [
      { title: "오답노트", sub: `${subject} 6회차`, done: true },
      { title: "미니 모의고사 (OMR)", sub: "이번 주 필수", done: true },
      { title: `${subject} 7회차 과제`, sub: "제출 전", done: false },
    ],
    notice: {
      title: "이번 주 숙제 제출 안내",
      body: "토요일 수업 전까지 오답노트와 미니 모의고사를 제출해 주세요.",
      teacher: `${space.name}`,
      date: "07-02",
    },
  };
}
