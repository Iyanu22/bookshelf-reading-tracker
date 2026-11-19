"use client";

import { Loader2, RotateCw, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CURATED_LISTS } from "@/lib/discover/curated";
import { GENRES, genreBySlug, type Genre } from "@/lib/discover/genres";
import { ERROR_COPY, fetchBooks, type BooksPage, type FetchError } from "@/lib/openlibrary/client";
import { useLibrary } from "@/lib/store/library-store";
import { DiscoverCard, DiscoverGrid } from "./DiscoverCard";

function GenreSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-6">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i}>
          <div className="aspect-[2/3] animate-pulse rounded-sm bg-bg-tertiary" />
          <div className="mt-3 h-3.5 w-4/5 animate-pulse rounded bg-bg-tertiary" />
          <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-bg-tertiary" />
        </div>
      ))}
    </div>
  );
}

function GenreResults({ genre }: { genre: Genre }) {
  const [data, setData] = useState<BooksPage | null>(null);
  const [error, setError] = useState<FetchError | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  const [attempt, setAttempt] = useState(0);

  // The component is keyed by genre, so it mounts empty for each one; state is
  // only set from the promise callbacks. `attempt` re-runs it for "Try again".
  useEffect(() => {
    const id = ++requestId.current;
    fetchBooks("genre", { genre: genre.slug, page: "1" }).then(
      (page) => id === requestId.current && setData(page),
      (err) => id === requestId.current && setError(err as FetchError),
    );
  }, [genre.slug, attempt]);

  const retry = () => {
    setError(null);
    setData(null);
    setAttempt((a) => a + 1);
  };

  const loadMore = async () => {
    if (!data) return;
    setLoadingMore(true);
    try {
      const next = await fetchBooks("genre", { genre: genre.slug, page: String(data.page + 1) });
      const seen = new Set(data.books.map((b) => b.key));
      setData({ ...next, books: [...data.books, ...next.books.filter((b) => !seen.has(b.key))] });
    } catch (err) {
      setError(err as FetchError);
    } finally {
      setLoadingMore(false);
    }
  };

  const copy = error ? (ERROR_COPY[error.code] ?? ERROR_COPY.unavailable) : null;

  return (
    <section aria-labelledby="genre-heading" aria-busy={!data && !error} className="mt-10">
      <h2 id="genre-heading" className="text-xl font-semibold">
        Popular in {genre.label}
      </h2>
      <p className="mt-1 text-sm text-text-tertiary">The books Open Library readers are shelving most.</p>
      <div className="mt-6" aria-live="polite">
        {copy ? (
          <div role="alert" className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-lg font-semibold">{copy.title}</h3>
            <p className="mt-1 text-text-secondary">{copy.body}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-md border border-border px-4 font-medium hover:bg-bg-tertiary"
            >
              <RotateCw aria-hidden size={16} /> Try again
            </button>
          </div>
        ) : !data ? (
          <>
            <p className="sr-only">Loading {genre.label} books…</p>
            <GenreSkeleton />
          </>
        ) : data.books.length === 0 ? (
          <p className="text-text-secondary">
            Nothing to show for this genre right now. Try another, or{" "}
            <Link href="/search" className="text-accent underline underline-offset-2">
              search directly
            </Link>
            .
          </p>
        ) : (
          <>
            <DiscoverGrid label={`Popular ${genre.label} books`}>
              {data.books.map((b, i) => (
                <li key={b.key}>
                  <DiscoverCard book={b} priority={i < 6} />
                </li>
              ))}
            </DiscoverGrid>
            {data.hasMore && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-5 font-medium hover:bg-bg-tertiary disabled:opacity-60"
                >
                  {loadingMore && <Loader2 aria-hidden size={16} className="animate-spin" />}
                  {loadingMore ? "Loading…" : `More ${genre.label.toLowerCase()}`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export function Discover() {
  const genre = genreBySlug(useSearchParams().get("genre"));
  const isEmpty = useLibrary((s) => s.status === "ready" && s.entries.length === 0);

  return (
    <div className="mx-auto max-w-library">
      <title>{genre ? `${genre.label} — Discover — Bookshelf` : "Discover — Bookshelf"}</title>
      <h1 className="text-xl font-semibold sm:text-2xl">Discover</h1>
      <p className="mt-1 max-w-2xl text-text-secondary">
        Hand-picked starting points, and what readers are shelving in every genre. Tap{" "}
        <span className="font-medium text-text-primary">Want to Read</span> on anything that catches your eye.
      </p>

      {isEmpty && (
        <div className="mt-6 flex gap-3 rounded-xl border border-accent/30 bg-accent-subtle p-5">
          <Sparkles aria-hidden size={20} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="font-heading text-lg font-semibold">Let&apos;s fill your first shelf</p>
            <p className="mt-1 text-sm text-text-secondary">
              Pick five books that sound good from the lists below — it takes about a minute. Already know what
              you&apos;re reading?{" "}
              <Link href="/search" className="font-medium text-accent underline underline-offset-2">
                Search for it
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      <nav aria-label="Browse by genre" className="mt-8">
        <h2 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Browse by genre</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {GENRES.map((g) => {
            const active = g.slug === genre?.slug;
            return (
              <li key={g.slug}>
                <Link
                  href={active ? "/discover" : `/discover?genre=${g.slug}`}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-11 items-center rounded-full border px-4 text-sm transition-colors lg:h-9 ${
                    active
                      ? "border-accent bg-accent text-bg-primary"
                      : "border-border bg-surface text-text-secondary hover:border-accent hover:text-accent"
                  }`}
                >
                  {g.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {genre && <GenreResults key={genre.slug} genre={genre} />}

      {CURATED_LISTS.map((list, li) => (
        <section key={list.id} aria-labelledby={`list-${list.id}`} className="mt-14">
          <div className="border-b border-border-subtle pb-3">
            <h2 id={`list-${list.id}`} className="text-xl font-semibold">
              {list.title}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{list.blurb}</p>
          </div>
          <div className="mt-6">
            <DiscoverGrid label={list.title}>
              {list.books.map((b) => (
                <li key={b.key}>
                  <DiscoverCard book={b} priority={!genre && li === 0} />
                </li>
              ))}
            </DiscoverGrid>
          </div>
        </section>
      ))}

      <p className="mt-16 flex flex-wrap items-center justify-center gap-2 text-center text-text-secondary">
        Looking for something specific?
        <Link href="/search" className="inline-flex items-center gap-1.5 font-medium text-accent underline underline-offset-2">
          <Search aria-hidden size={16} /> Search the catalogue
        </Link>
      </p>
    </div>
  );
}
