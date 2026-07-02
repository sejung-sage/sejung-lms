import { mockDashboard, type Dashboard } from "@/lib/mock/dashboard";

/**
 * TD 대시보드 데이터 seam.
 * USE_MOCK_DB=true → 목. 아니면 실 DB 집계 (추후 구현).
 */
const useMock = process.env.USE_MOCK_DB === "true";

const EMPTY: Dashboard = {
  studentCount: 0,
  todaySessions: [],
  missingHomework: [],
  gradeSummary: [],
  clinics: [],
  notices: [],
  approvals: [],
};

export async function getDashboard(space: {
  name: string;
  subject: string | null;
  slug: string | null;
}): Promise<Dashboard> {
  if (useMock) return mockDashboard(space);

  // TODO(실 DB): enrollments/sessions/submissions/exam_results/clinics/notices 집계.
  // 실 DB 붙는 시점에 구현 — 그 전까지 빈 대시보드로 안전하게 렌더.
  return EMPTY;
}

export type { Dashboard };
