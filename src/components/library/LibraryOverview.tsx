"use client";

import { ArrowRight, Compass, Search } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { formatAuthors } from "@/lib/books";
import { useGoalProgress, useShelfCounts, useSortedShelves } from "@/lib/store/hooks";
import { useLibrary } from "@/lib/store/library-store";
import type { LibraryEntry } from "@/lib/types";
import { BookCover } from "../book/BookCover";
import { BookTile, GridSkeleton } from "../book/BookTile";
import { ProgressUpdater } from "../book/ProgressUpdater";
import { GoalCard } from "../goal/GoalCard";

const PREVIEW_COUNT = 8;

function ReadingCard({ entry, priority }: { entry: LibraryEntry; priority: boolean }) {
  const genre = entry.book.genres.find((g) => !/fiction|non-fiction/i.test(g)) ?? entry.book.genres[0];
  return (
    <li className="flex gap-4 rounded-xl border border-border-subtle bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/books/${entry.id}`} className="w-20 shrink-0 sm:w-24" tabIndex={-1} aria-hidden>
        <BookCover book={entry.book} priority={priority} decorative />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-lg leading-snug font-medium">
          <Link href={`/books/${entry.id}`} className="line-clamp-2 hover:text-accent">
            {entry.book.title}
          </Link>
        </h3>
        <p className="truncate text-sm text-text-secondary">{formatAuthors(entry.book.authors)}</p>
        {genre && (
          <p className="mt-2 w-fit rounded-sm bg-bg-tertiary px-2 py-0.5 text-xs text-text-secondary">{genre}</p>
        )}
        <div className="mt-auto pt-4">
          <ProgressUpdater entry={entry} />
        </div>
      </div>
    </li>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col-reverse rounded-xl border border-border-subtle bg-surface px-5 py-4 shadow-sm">
      <dt className="mt-1 text-sm text-text-tertiary">{label}</dt>
      <dd className="font-heading text-3xl font-bold text-text-primary tabular-nums">{value}</dd>
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h2 className="text-2xl font-semibold">Every great library starts with one book</h2>
      <p className="mt-3 text-text-secondary">
        Browse hand-picked starter lists and popular books by genre, or search for the one on your nightstand.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/discover"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 font-semibold text-bg-primary hover:bg-accent-hover"
        >
          <Compass aria-hidden size={18} /> Discover books
        </Link>
        <Link
          href="/search"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border px-5 font-semibold hover:bg-bg-tertiary"
        >
          <Search aria-hidden size={18} /> Search
        </Link>
      </div>
    </div>
  );
}

export function LibraryOverview() {
  const status = useLibrary((s) => s.status);
  const entries = useLibrary((s) => s.entries);
  const shelves = useSortedShelves();
  const counts = useShelfCounts();
  const { completed, year } = useGoalProgress();

  const byShelf = useMemo(() => {
    const map: Record<string, LibraryEntry[]> = {};
    for (const e of entries) (map[e.shelfId] ??= []).push(e);
    // Most recently touched first within each shelf preview.
    for (const list of Object.values(map))
      list.sort((a, b) =>
        (b.progress?.updatedAt ?? b.finishedAt ?? b.addedAt).localeCompare(a.progress?.updatedAt ?? a.finishedAt ?? a.addedAt),
      );
    return map;
  }, [entries]);

  if (status !== "ready") {
    return (
      <div className="mx-auto max-w-library" aria-busy="true">
        <div className="h-9 w-56 animate-pulse rounded bg-bg-tertiary" />
        <div className="mt-8">
          <GridSkeleton count={8} />
        </div>
      </div>
    );
  }

  const readingShelf = shelves.find((s) => s.kind === "reading");
  const reading = readingShelf ? (byShelf[readingShelf.id] ?? []) : [];
  const otherShelves = shelves.filter((s) => s.kind !== "reading");

  return (
    <div className="mx-auto max-w-library">
      <h1 className="text-xl font-semibold sm:text-2xl">Your library</h1>

      {entries.length === 0 ? (
        <>
          <EmptyLibrary />
          <GoalCard />
        </>
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_minmax(0,22rem)]">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              <Stat value={entries.length} label="Books in your library" />
              <Stat value={completed} label={`Read in ${year}`} />
              <Stat value={reading.length} label="Reading right now" />
            </dl>
            <div className="lg:row-span-2">
              <GoalCard />
            </div>
          </div>

          {readingShelf && (
            <section aria-labelledby="reading-heading" className="mt-12">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="reading-heading" className="text-xl font-semibold">
                  Currently Reading{" "}
                  <span className="font-sans text-base font-normal text-text-tertiary">{reading.length} books</span>
                </h2>
                <Link href={`/shelves/${readingShelf.id}`} className="text-sm font-medium text-accent hover:underline">
                  View shelf
                </Link>
              </div>
              {reading.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-text-secondary">
                  Nothing on the go. Pick something from{" "}
                  <Link href="/search" className="text-accent underline underline-offset-2">
                    search
                  </Link>{" "}
                  or your Want to Read shelf.
                </p>
              ) : (
                <ul className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {reading.map((e, i) => (
                    <ReadingCard key={e.id} entry={e} priority={i < 3} />
                  ))}
                </ul>
              )}
            </section>
          )}

          {otherShelves.map((shelf) => {
            const list = byShelf[shelf.id] ?? [];
            const headingId = `shelf-${shelf.id}-heading`;
            return (
              <section key={shelf.id} aria-labelledby={headingId} className="mt-12">
                <div className="flex items-baseline justify-between gap-4 border-b border-border-subtle pb-3">
                  <h2 id={headingId} className="text-xl font-semibold">
                    {shelf.name}{" "}
                    <span className="font-sans text-base font-normal text-text-tertiary">
                      {counts[shelf.id] ?? 0} {counts[shelf.id] === 1 ? "book" : "books"}
                    </span>
                  </h2>
                  {list.length > 0 && (
                    <Link
                      href={`/shelves/${shelf.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-accent hover:underline"
                    >
                      See all<span className="sr-only"> {shelf.name}</span>
                      <ArrowRight aria-hidden size={14} />
                    </Link>
                  )}
                </div>
                {list.length === 0 ? (
                  <p className="mt-4 text-text-secondary">
                    This shelf is waiting for its first book.{" "}
                    <Link href="/search" className="text-accent underline underline-offset-2">
                      Search to add one.
                    </Link>
                  </p>
                ) : (
                  <div className="mt-5">
                    {/* Fixed columns so previews always fill complete rows: 3×2 → 4 → 6 → 8. */}
                    <ul
                      aria-label={shelf.name}
                      className="grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4 sm:gap-x-6 lg:grid-cols-6 2xl:grid-cols-8"
                    >
                      {list.slice(0, PREVIEW_COUNT).map((e, i) => (
                        <li key={e.id} className={i >= 6 ? "hidden 2xl:block" : i >= 4 ? "sm:max-lg:hidden" : undefined}>
                          <BookTile entry={e} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
