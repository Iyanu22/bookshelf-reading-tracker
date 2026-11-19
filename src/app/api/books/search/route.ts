import type { NextRequest } from "next/server";
import { OpenLibraryError, searchOpenLibrary, type SearchErrorCode } from "@/lib/openlibrary/search";

const STATUS: Record<SearchErrorCode, number> = {
  "rate-limited": 429,
  timeout: 504,
  unavailable: 502,
  "bad-response": 502,
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Math.min(20, Number(request.nextUrl.searchParams.get("page")) || 1));

  if (q.length < 2) {
    return Response.json({ error: { code: "invalid-query", message: "Type at least two characters." } }, { status: 400 });
  }

  try {
    const result = await searchOpenLibrary(q.slice(0, 120), page);
    return Response.json(result, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
  } catch (err) {
    if (err instanceof OpenLibraryError) {
      return Response.json(
        { error: { code: err.code, message: err.message } },
        { status: STATUS[err.code], headers: err.code === "rate-limited" ? { "Retry-After": "10" } : undefined },
      );
    }
    console.error(err);
    return Response.json({ error: { code: "unavailable", message: "Search failed unexpectedly." } }, { status: 500 });
  }
}
