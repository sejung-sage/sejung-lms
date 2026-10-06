import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * 요청마다 Supabase 세션 쿠키를 갱신하고, 로그인 안 한 사람을 /login 으로 보낸다.
 *
 * 여기는 "빨리 돌려보내기"용이다. 실제 권한 판단(이 공간의 운영진인가 등)은
 * lib/auth.ts 가 페이지·서버 액션 안에서 다시 한다.
 *
 * 로그인 없이 열려야 하는 곳: /login, /l/{token}(알림톡 매직링크)
 */

const PUBLIC = [/^\/login(\/|$)/, /^\/l\//];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser() 가 만료된 토큰을 갱신하면서 위 setAll 로 새 쿠키를 심는다
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && !PUBLIC.some((re) => re.test(path))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = path === "/" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mjs|js|css|map)$).*)"],
};
