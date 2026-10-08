import type { NavKey } from "./AdminSidebar";

/** 화면 제목·부제 — 강사 공간 화면과 강좌 화면이 같이 쓴다 */
export const SECTION_META: Record<string, { key: NavKey; title: string; subtitle: string }> = {
  attendance: { key: "attendance", title: "출석", subtitle: "가장 최근 수업의 등원·출결" },
  homework: { key: "homework", title: "숙제", subtitle: "가장 최근 숙제의 제출 현황" },
  todos: { key: "todos", title: "할 일", subtitle: "재시험·클리닉 예약 등 미완료 목록" },
  clinic: { key: "clinic", title: "클리닉", subtitle: "예약·등원·하원·피드백 현황" },
  grades: { key: "grades", title: "성적", subtitle: "최근 시험 성적 · 100점 환산" },
  omr: { key: "omr", title: "OMR 채점", subtitle: "정답 등록 · 학생 제출 · 조교 대리 입력 · 종이 스캔" },
  students: { key: "students", title: "학생", subtitle: "재원생 · 학부모 리포트 링크 · 로그인 계정" },
  approvals: { key: "approvals", title: "계정 승인", subtitle: "앱 가입·예약 승인 큐" },
  videos: { key: "videos", title: "영상", subtitle: "강의 영상 업로드·배정" },
};

/** 강사 공간(강좌 고르기 전) 화면에 남는 메뉴 */
export const SPACE_SECTIONS = new Set(["students", "approvals", "videos"]);
/** 강좌 안 메뉴 */
export const COURSE_SECTIONS = new Set(["attendance", "homework", "todos", "clinic", "grades", "omr", "students"]);
