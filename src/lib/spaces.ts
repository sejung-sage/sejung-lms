import { createAdminClient } from "@/lib/supabase/admin";
import { MOCK_SPACES } from "@/lib/mock/spaces";
import type { TeacherSpace } from "@/components/TeacherIcon";

/**
 * 쌤 공간 데이터 접근 seam.
 * USE_MOCK_DB=true 이면 목 데이터, 아니면 Supabase(admin) 조회.
 * 인증/역할 스코프가 붙으면 admin → RLS 클라이언트로 교체.
 */
const useMock = process.env.USE_MOCK_DB === "true";

/** 화면 데이터 함수들이 공통으로 받는 공간 식별자. id 가 있어야 실 DB 조회가 된다. */
export type SpaceDetail = {
  id: string;
  name: string;
  subject: string | null;
  slug: string | null;
  accent_color: string;
};

export async function getSpaces(): Promise<TeacherSpace[]> {
  if (useMock) return MOCK_SPACES;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("teacher_spaces")
    .select("id, name, subject, slug, accent_color, icon_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[spaces] teacher_spaces 조회 실패:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getSpaceBySlug(slug: string): Promise<SpaceDetail | null> {
  if (useMock) {
    const s = MOCK_SPACES.find((x) => x.slug === slug);
    return s
      ? { id: s.id, name: s.name, subject: s.subject, slug: s.slug, accent_color: s.accent_color }
      : null;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("teacher_spaces")
    .select("id, name, subject, slug, accent_color")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  return data ?? null;
}
