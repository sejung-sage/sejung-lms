import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버(서버 컴포넌트 / 라우트 핸들러 / 서버 액션)용 Supabase 클라이언트.
 * Next.js 16 에서 cookies() 는 async 이므로 await 후 넘긴다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서 호출된 경우 set 이 불가능할 수 있다.
            // 미들웨어에서 세션을 갱신하면 무시해도 안전하다.
          }
        },
      },
    },
  );
}
