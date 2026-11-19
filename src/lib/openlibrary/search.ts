import "server-only";
import { cacheLife } from "next/cache";
import { bookKey, workSignature } from "../books";
import type { Book } from "../types";

export const RESULTS_PER_PAGE = 24;

export type SearchErrorCode = "rate-limited" | "timeout" | "unavailable" | "bad-response";

export class OpenLibraryError extends Error {
  constructor(
    public code: SearchErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface SearchResponse {
  books: Book[];
  total: number;
  page: number;
  hasMore: boolean;
}

interface OLDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
  isbn?: string[];
  publisher?: string[];
  subject?: string[];
}

const FIELDS = "key,title,author_name,first_publish_year,number_of_pages_median,cover_i,isbn,publisher,subject";

/** Open Library subjects are noisy ("Accessible book", "In library", years…). Keep the useful ones. */
const SUBJECT_NOISE =
  /accessible book|protected daisy|in library|large type|lending library|open library|nyt:|reading level|^\d|fiction, general|translations? into|bestseller|literature$|^form:|^place:|^time:|^person:/i;

function cleanSubjects(subjects: string[] = []) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of subjects) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > 32 || SUBJECT_NOISE.test(trimmed)) continue;
    // "Genre:Fantasy" → "Fantasy"
    const s = trimmed.replace(/^genre:\s*/i, "");
    const titled = s.replace(/\b\w/g, (c) => c.toUpperCase());
    if (seen.has(titled.toLowerCase())) continue;
    seen.add(titled.toLowerCase());
    out.push(titled);
    if (out.length === 4) break;
  }
  return out;
}

function toBook(doc: OLDoc): Book | null {
  if (!doc.title || !doc.key) return null;
  const isbns = doc.isbn ?? [];
  const isbn13 = isbns.find((i) => i.length === 13) ?? null;
  const isbn10 = isbns.find((i) => i.length === 10) ?? null;
  const openLibraryId = doc.key.replace("/works/", "");
  const partial = { title: doc.title, authors: doc.author_name?.slice(0, 4) ?? [], isbn13, openLibraryId };
  return {
    ...partial,
    key: bookKey(partial),
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    pageCount: doc.number_of_pages_median && doc.number_of_pages_median > 0 ? doc.number_of_pages_median : null,
    publishedYear: doc.first_publish_year ?? null,
    isbn10,
    publisher: doc.publisher?.[0] ?? null,
    description: null,
    genres: cleanSubjects(doc.subject),
  };
}

/** Normalizes a query: bare ISBNs (with or without dashes) become `isbn:` lookups. */
export function buildQuery(raw: string) {
  const q = raw.trim();
  const digits = q.replace(/[-\s]/g, "");
  if (/^(\d{9}[\dXx]|\d{13})$/.test(digits)) return `isbn:${digits}`;
  return q;
}

/** Shared request + normalization for every Open Library search-style call. */
async function runSearch(params: Record<string, string>, page: number): Promise<SearchResponse> {
  const url = new URL("https://openlibrary.org/search.json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("limit", String(RESULTS_PER_PAGE));
  url.searchParams.set("page", String(page));

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "Bookshelf/0.1 (personal reading tracker)" },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError")
      throw new OpenLibraryError("timeout", "Open Library took too long to respond.");
    throw new OpenLibraryError("unavailable", "Couldn't reach Open Library.");
  }
  if (res.status === 429) throw new OpenLibraryError("rate-limited", "Too many searches.");
  if (!res.ok) throw new OpenLibraryError("unavailable", `Open Library returned ${res.status}.`);

  let data: { numFound?: number; docs?: OLDoc[] };
  try {
    data = await res.json();
  } catch {
    throw new OpenLibraryError("bad-response", "Open Library sent a response we couldn't read.");
  }

  // Collapse duplicate works (same title + first author) that slip through.
  const seen = new Set<string>();
  const books: Book[] = [];
  for (const doc of data.docs ?? []) {
    const book = toBook(doc);
    if (!book) continue;
    const sig = workSignature(book);
    if (seen.has(sig)) continue;
    seen.add(sig);
    books.push(book);
  }
  const total = data.numFound ?? books.length;
  return { books, total, page, hasMore: page * RESULTS_PER_PAGE < total };
}

/**
 * Cached for an hour per (query, page): repeated searches are instant and we
 * stay well inside Open Library's rate limits.
 */
export async function searchOpenLibrary(query: string, page: number): Promise<SearchResponse> {
  "use cache";
  cacheLife("hours");
  return runSearch({ q: buildQuery(query) }, page);
}

/**
 * Most-shelved books for a genre, ranked by Open Library's reading logs —
 * i.e. what real readers are tracking, rather than whichever public-domain
 * classic has the most editions. Popularity shifts slowly, so cache for a day.
 */
export async function browseGenre(subjectQuery: string, page: number): Promise<SearchResponse> {
  "use cache";
  cacheLife("days");
  return runSearch({ q: `${subjectQuery} language:eng`, sort: "readinglog" }, page);
}
