import type { NextRequest } from "next/server";
import { genreBySlug } from "@/lib/discover/genres";
import { browseGenre, OpenLibraryError, type SearchErrorCode } from "@/lib/openlibrary/search";

const STATUS: Record<SearchErrorCode, number> = {
  "rate-limited": 429,
  timeout: 504,
  unavailable: 502,
  "bad-response": 502,
};

export async function GET(request: NextRequest) {
  const genre = genreBySlug(request.nextUrl.searchParams.get("genre"));
  const page = Math.max(1, Math.min(10, Number(request.nextUrl.searchParams.get("page")) || 1));
  if (!genre) {
    return Response.json({ error: { code: "invalid-genre", message: "Unknown genre." } }, { status: 400 });
  }
  try {
    const result = await browseGenre(genre.query, page);
    return Response.json(result, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
  } catch (err) {
    if (err instanceof OpenLibraryError) {
      return Response.json({ error: { code: err.code, message: err.message } }, { status: STATUS[err.code] });
    }
    console.error(err);
    return Response.json({ error: { code: "unavailable", message: "Browsing failed unexpectedly." } }, { status: 500 });
  }
}
