import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { APP_ROUTES, GUEST_COOKIE, SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * 1. Refreshes the Supabase session cookie on every request.
 * 2. Optimistic route protection: app routes need a user or a guest session.
 *    (Row-level security in Postgres is the real authorization boundary.)
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  let signedIn = false;

  if (isSupabaseConfigured) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  }

  const { pathname } = request.nextUrl;
  const isAppRoute = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  const isGuest = request.cookies.get(GUEST_COOKIE)?.value === "1";

  if (isAppRoute && !signedIn && !isGuest) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (signedIn && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const url = request.nextUrl.clone();
    url.pathname = "/library";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
