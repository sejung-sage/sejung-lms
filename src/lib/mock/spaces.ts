import type { TeacherSpace } from "@/components/TeacherIcon";

/**
 * 목(mock) 쌤 공간 데이터 — supabase/seed.sql 과 동일하게 유지.
 * Supabase 인시던트로 실 DB 대기 중일 때 런처를 채우는 용도.
 * 실 DB 붙으면 USE_MOCK_DB=false 로 끄면 된다.
 */
export const MOCK_SPACES: (TeacherSpace & { subject: string })[] = [
  { id: "m1", name: "김쌤", subject: "수학", slug: "kim-math", accent_color: "#2563eb", icon_url: null },
  { id: "m2", name: "박쌤", subject: "수학", slug: "park-math", accent_color: "#16a34a", icon_url: null },
  { id: "m3", name: "글로리아", subject: "영어", slug: "gloria-eng", accent_color: "#9333ea", icon_url: null },
  { id: "m4", name: "손쌤", subject: "국어", slug: "son-kor", accent_color: "#ea580c", icon_url: null },
  { id: "m5", name: "백신", subject: "화학", slug: "baek-chem", accent_color: "#0891b2", icon_url: null },
  { id: "m6", name: "꽉처스", subject: "수학", slug: "quakchers-math", accent_color: "#db2777", icon_url: null },
];
