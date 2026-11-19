import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE } from "@/lib/supabase/config";

/**
 * "Try as Guest": one click from the landing page. The cookie has no expiry,
 * so it's a browser-session cookie — guest data doesn't follow you to the next visit.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/library", request.url));
  response.cookies.set(GUEST_COOKIE, "1", { path: "/", sameSite: "lax" });
  return response;
}
