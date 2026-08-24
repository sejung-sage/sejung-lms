// 세정 LMS — 관리자 하위화면 목 데이터. 학생 명단 기반으로 파생.

export type Student = {
  name: string; school: string; grade: string; phone: string;
  className: string; attendanceRate: number; hwRate: number;
  status: "재원" | "휴원";
};

const ROSTER: Omit<Student, "className" | "attendanceRate" | "hwRate" | "status">[] = [
  { name: "김도윤", school: "대치중", grade: "중3", phone: "010-2xx-1043" },
  { name: "이서준", school: "휘문고", grade: "고1", phone: "010-3xx-8820" },
  { name: "박하은", school: "숙명여중", grade: "중2", phone: "010-5xx-2291" },
  { name: "최지우", school: "경기고", grade: "고2", phone: "010-4xx-7712" },
  { name: "정예진", school: "단대부고", grade: "고1", phone: "010-8xx-3390" },
  { name: "강하람", school: "대명중", grade: "중3", phone: "010-2xx-5567" },
  { name: "윤채원", school: "중동고", grade: "고2", phone: "010-7xx-1123" },
  { name: "한지호", school: "역삼중", grade: "중2", phone: "010-9xx-4408" },
];

function seed(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 100000;
  return (min: number, max: number) => min + (h = (h * 1103515245 + 12345) % 100000) % (max - min + 1);
}

export function mockStudents(subject: string): Student[] {
  return ROSTER.map((r, i) => {
    const rnd = seed(r.name + subject);
    return {
      ...r,
      className: `${subject} ${i % 2 === 0 ? "정규 A반" : "정규 B반"}`,
      attendanceRate: rnd(82, 100),
      hwRate: rnd(60, 100),
      status: i === 5 ? "휴원" : "재원",
    };
  });
}

export type AttendanceRow = { name: string; status: "출석" | "지각" | "결석" | "예정"; time: string };
export function mockAttendance(subject: string): { session: string; rows: AttendanceRow[] } {
  const students = mockStudents(subject);
  const rows: AttendanceRow[] = students.map((s, i) => {
    const st = i < 5 ? "출석" : i === 5 ? "지각" : i === 6 ? "결석" : "예정";
    return { name: s.name, status: st, time: st === "출석" ? `17:${50 + (i % 9)}` : st === "지각" ? "18:12" : "—" };
  });
  return { session: `${subject} 정규 A반 · 7회차 (토 18:00)`, rows };
}

export type HwRow = { name: string; status: "제출" | "미제출" | "지각"; at: string };
export function mockHomework(subject: string): { title: string; due: string; rows: HwRow[] } {
  const students = mockStudents(subject);
  const rows: HwRow[] = students.map((s, i) => {
    const st = i < 5 ? "제출" : i === 5 ? "지각" : "미제출";
    return { name: s.name, status: st, at: st === "미제출" ? "—" : `07-0${(i % 3) + 1} 2${i % 3}:1${i % 6}` };
  });
  return { title: `${subject} 7회차 · 단어 100 + 오답노트`, due: "07-04 (토)", rows };
}

export type GradeRow = { name: string; scores: number[]; avg: number };
export function mockGrades(subject: string): { columns: string[]; rows: GradeRow[] } {
  const columns = ["단어시험", "문법", "숙제완성도"];
  const students = mockStudents(subject);
  const rows: GradeRow[] = students.map((s) => {
    const rnd = seed(s.name + "grade");
    const scores = [rnd(55, 95), rnd(40, 100), rnd(70, 100)];
    return { name: s.name, scores, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) };
  });
  return { columns, rows };
}

export type ApprovalRow = { name: string; type: "신규 가입" | "예약 신청"; detail: string; channel: string; at: string };
export function mockApprovals(): ApprovalRow[] {
  return [
    { name: "정예진", type: "예약 신청", detail: "주관식 재시험 예약", channel: "앱", at: "07-01 10:35" },
    { name: "한지호", type: "신규 가입", detail: "학생 앱 가입 승인 대기", channel: "앱", at: "07-01 09:12" },
    { name: "서지안", type: "신규 가입", detail: "학부모 앱 가입 승인 대기", channel: "앱", at: "06-30 21:40" },
  ];
}

export type TodoRow = {
  name: string;
  kind: "재시험" | "온라인 제출" | "클리닉 예약" | "과제" | "설문" | "수동";
  title: string;
  due: string;
  state: "미완료" | "완료" | "면제";
};

export function mockTodos(subject: string): TodoRow[] {
  return mockStudents(subject).slice(0, 6).map((s, i) => ({
    name: s.name,
    kind: i % 3 === 0 ? "재시험" : i % 3 === 1 ? "클리닉 예약" : "과제",
    title: i % 3 === 0 ? `${subject} 7회차 재시험 응시` : i % 3 === 1 ? `${subject} 7회차 클리닉 예약` : `${subject} 오답노트`,
    due: `08-${22 + i}`,
    state: i === 5 ? "완료" : "미완료",
  }));
}

export type ClinicRow = {
  name: string;
  session: string;
  time: string;
  status: "예약" | "등원" | "하원" | "미등원" | "취소";
  feedback: string;
};

export function mockClinicReservations(subject: string): ClinicRow[] {
  return mockStudents(subject).slice(0, 7).map((s, i) => ({
    name: s.name,
    session: `${subject} 재시험 클리닉`,
    time: `08-${22 + (i % 2)} ${i < 4 ? "18:00" : "20:00"}`,
    status: i < 2 ? "예약" : i < 4 ? "등원" : i === 4 ? "하원" : "미등원",
    feedback: i === 4 ? "오답 정리 완료, 2차 재시험 권장" : "—",
  }));
}
