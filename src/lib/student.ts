import { mockStudentHome, type StudentHome } from "@/lib/mock/student";

/**
 * SA 학생앱 데이터 seam.
 * USE_MOCK_DB=true → 목. 아니면 실 DB (추후, 로그인 학생 기준 스코프).
 */
const useMock = process.env.USE_MOCK_DB === "true";

export async function getStudentHome(space: {
  name: string;
  subject: string | null;
  slug: string | null;
}): Promise<StudentHome | null> {
  if (useMock) return mockStudentHome(space);

  // TODO(실 DB): 로그인 학생의 enrollment/과제/성적/공지 집계.
  return null;
}

export type { StudentHome };
