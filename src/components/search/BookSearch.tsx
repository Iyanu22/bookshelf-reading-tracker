"use client";

import { Check, Loader2, Plus, RotateCw, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { formatAuthors } from "@/lib/books";
import { useSortedShelves } from "@/lib/store/hooks";
import { useLibrary } from "@/lib/store/library-store";
import type { Book } from "@/lib/types";
import { BookCover } from "../book/BookCover";

interface SearchResponse {
  books: Book[];
  total: number;
  page: number;
  hasMore: boolean;
}

type SearchError = { code: string; message: string };

const ERROR_COPY: Record<string, { title: string; body: string }> = {
  "rate-limited": {
    title: "Open Library needs a short breather",
    body: "We've sent a lot of searches in a short time. Wait about 10 seconds, then try again.",
  },
  timeout: {
    title: "Open Library is responding slowly",
    body: "The book catalogue didn't answer in time. It's usually temporary — try again in a moment.",
  },
  unavailable: {
    title: "Open Library is unavailable right now",
    body: "We couldn't reach the book catalogue. Your library is unaffected — try searching again shortly.",
  },
  offline: {
    title: "You appear to be offline",
    body: "Check your internet connection, then try again. Your shelves still work offline in this tab.",
  },
  "bad-response": {
    title: "We got an unexpected response",
    body: "Open Library sent data we couldn't read. Try a slightly different search.",
  },
};

// Session-level cache: back/forward and repeat searches cost no requests.
const cache = new Map<string, SearchResponse>();
let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1000; // Open Library asks for ≤1 request/second.

async function fetchResults(q: string, page: number): Promise<SearchResponse> {
  const key = `${q.toLowerCase()}|${page}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  let res: Response;
  try {
    res = await fetch(`/api/books/search?${new URLSearchParams({ q, page: String(page) })}`);
  } catch {
    throw { code: navigator.onLine ? "unavailable" : "offline", message: "" } satisfies SearchError;
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) throw (body?.error ?? { code: "unavailable", message: "" }) as SearchError;
  cache.set(key, body);
  return body as SearchResponse;
}

function AddControl({ book }: { book: Book }) {
  const shelves = useSortedShelves();
  const addBook = useLibrary((s) => s.addBook);
  const existing = useLibrary((s) => s.findExisting(book));
  const ready = useLibrary((s) => s.status === "ready");
  const defaultShelf = shelves.find((s) => s.kind === "want")?.id ?? shelves[0]?.id ?? "";
  const [shelfId, setShelfId] = useState("");
  const selectId = useId();
  const chosen = shelfId || defaultShelf;

  if (existing) {
    const shelf = shelves.find((s) => s.id === existing.shelfId);
    return (
      <p className="inline-flex flex-wrap items-center gap-1.5 text-sm">
        <span className="inline-flex items-center gap-1 rounded-sm bg-success/10 px-2 py-1 font-medium text-success">
          <Check aria-hidden size={14} /> In your library
        </span>
        <Link href={`/books/${existing.id}`} className="text-text-secondary underline underline-offset-2 hover:text-accent">
          on {shelf?.name ?? "a shelf"}
        </Link>
      </p>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const entry = await addBook(book, chosen);
        if (entry) useLibrary.getState().notify(`Added “${book.title}” to ${shelves.find((s) => s.id === chosen)?.name}.`, "success");
      }}
    >
      <label htmlFor={selectId} className="sr-only">
        Shelf for {book.title}
      </label>
      <select
        id={selectId}
        value={chosen}
        disabled={!ready}
        onChange={(e) => setShelfId(e.target.value)}
        className="h-10 max-w-44 rounded-md border border-border bg-surface px-2 text-sm focus:border-accent focus:outline-none"
      >
        {shelves.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!ready}
        className="inline-flex h-10 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-semibold text-bg-primary hover:bg-accent-hover disabled:opacity-50"
      >
        <Plus aria-hidden size={16} /> Add<span className="sr-only"> {book.title}</span>
      </button>
    </form>
  );
}

function ResultItem({ book, priority }: { book: Book; priority: boolean }) {
  const meta = [
    book.publishedYear ? `First published ${book.publishedYear}` : null,
    book.pageCount ? `${book.pageCount} pages` : null,
  ].filter(Boolean);
  return (
    <li className="flex gap-4 border-b border-border-subtle py-5 last:border-0">
      <div className="w-16 shrink-0 sm:w-20">
        <BookCover book={book} size="sm" priority={priority} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h2 className="font-heading text-lg leading-snug font-medium">{book.title}</h2>
          <p className="text-sm text-text-secondary">{book.authors.length ? formatAuthors(book.authors) : "Author unknown"}</p>
          <p className="mt-1 text-xs text-text-tertiary">{meta.length ? meta.join(" · ") : "Publication details unavailable"}</p>
        </div>
        <div className="mt-2 shrink-0 sm:mt-0">
          <AddControl book={book} />
        </div>
      </div>
    </li>
  );
}

function ResultsSkeleton() {
  return (
    <ul aria-hidden className="mt-6">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex gap-4 border-b border-border-subtle py-5">
          <div className="aspect-[2/3] w-16 animate-pulse rounded-sm bg-bg-tertiary sm:w-20" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-5 w-2/3 animate-pulse rounded bg-bg-tertiary" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-bg-tertiary" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BookSearch() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlQuery = params.get("q") ?? "";
  const [input, setInput] = useState(urlQuery);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<SearchError | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  const run = useCallback(async (q: string) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchResults(q, 1);
      if (id === requestId.current) setResults(data);
    } catch (err) {
      if (id === requestId.current) {
        setResults(null);
        setError(err as SearchError);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  // The URL is the source of truth, so back/forward and shared links work.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInput(urlQuery);
    if (urlQuery.trim().length >= 2) run(urlQuery.trim());
    else setResults(null);
  }, [urlQuery, run]);

  const loadMore = async () => {
    if (!results) return;
    setLoadingMore(true);
    try {
      const next = await fetchResults(urlQuery.trim(), results.page + 1);
      setResults({ ...next, books: [...results.books, ...next.books.filter((b) => !results.books.some((r) => r.key === b.key))] });
    } catch (err) {
      setError(err as SearchError);
    } finally {
      setLoadingMore(false);
    }
  };

  const errorCopy = error ? (ERROR_COPY[error.code] ?? ERROR_COPY.unavailable) : null;

  return (
    <div className="mx-auto max-w-content">
      <title>{urlQuery ? `“${urlQuery}” — Search — Bookshelf` : "Find books — Bookshelf"}</title>
      <h1 className="text-xl font-semibold sm:text-2xl">Find books to add</h1>
      <p className="mt-1 text-text-secondary">Search the Open Library catalogue by title, author or ISBN.</p>

      <form
        role="search"
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const q = input.trim();
          if (q.length < 2) return;
          if (q === urlQuery) run(q);
          else router.push(`${pathname}?${new URLSearchParams({ q })}`);
        }}
      >
        <label htmlFor="book-search" className="sr-only">
          Title, author or ISBN
        </label>
        <div className="relative flex-1">
          <Search aria-hidden size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-tertiary" />
          <input
            id="book-search"
            type="search"
            value={input}
            autoFocus={!urlQuery}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Piranesi, Ursula K. Le Guin, 9780593135204"
            className="h-12 w-full rounded-lg border border-border bg-surface pr-3 pl-10 text-base shadow-sm placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={input.trim().length < 2}
          className="h-12 rounded-lg bg-accent px-5 font-semibold text-bg-primary hover:bg-accent-hover disabled:opacity-50"
        >
          Search
        </button>
      </form>

      <div aria-live="polite" aria-busy={loading} className="mt-2">
        {loading ? (
          <>
            <p className="sr-only">Searching…</p>
            <ResultsSkeleton />
          </>
        ) : errorCopy ? (
          <div role="alert" className="mt-6 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold">{errorCopy.title}</h2>
            <p className="mt-1 text-text-secondary">{errorCopy.body}</p>
            <button
              type="button"
              onClick={() => run(urlQuery.trim())}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-md border border-border px-4 font-medium hover:bg-bg-tertiary"
            >
              <RotateCw aria-hidden size={16} /> Try again
            </button>
          </div>
        ) : results && results.books.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border p-6">
            <h2 className="text-lg font-semibold">No books found for “{urlQuery}”</h2>
            <p className="mt-1 text-text-secondary">
              Try a different title or check the spelling. Searching by author name or ISBN often helps with less common books.
            </p>
          </div>
        ) : results ? (
          <>
            <p className="mt-4 text-sm text-text-tertiary">
              Showing {results.books.length} of {results.total.toLocaleString()} {results.total === 1 ? "result" : "results"}
            </p>
            <ul className="mt-2">
              {results.books.map((b, i) => (
                <ResultItem key={b.key} book={b} priority={i < 4} />
              ))}
            </ul>
            {results.hasMore && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-5 font-medium hover:bg-bg-tertiary disabled:opacity-60"
                >
                  {loadingMore && <Loader2 aria-hidden size={16} className="animate-spin" />}
                  {loadingMore ? "Loading…" : "Show more results"}
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
