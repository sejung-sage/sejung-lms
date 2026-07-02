import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * 서비스 롤 클라이언트 — RLS 를 우회한다. **서버에서만** 사용.
 * auth 도입 전 HM 런처가 공간 목록을 렌더하기 위한 임시 용도이며,
 * 인증/역할 스코프가 붙으면 server.ts(RLS) 로 교체한다.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
