import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Landing point for email links (sign-up confirmation, password recovery). */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/library";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/library";

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { error } = tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : { error: new Error("missing token") };
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  const failed = new URL("/sign-in", request.url);
  failed.searchParams.set("error", "link-expired");
  return NextResponse.redirect(failed);
}
