import Link from "next/link";
import { formatAuthors } from "@/lib/books";
import type { LibraryEntry } from "@/lib/types";
import { StarDisplay } from "../ui/StarRating";
import { BookCover } from "./BookCover";

/** Grid item: cover + title + author (+ rating when present). Lean on purpose. */
export function BookTile({
  entry,
  priority = false,
  headingLevel = 3,
  showRating = true,
}: {
  entry: LibraryEntry;
  priority?: boolean;
  headingLevel?: 2 | 3 | 4;
  showRating?: boolean;
}) {
  const H = `h${headingLevel}` as const;
  const pct = entry.progress && entry.finishedAt === null ? entry.progress.percent : null;
  return (
    <article className="group relative">
      <div className="transition-transform duration-300 ease-out group-hover:-translate-y-1 motion-reduce:group-hover:translate-y-0">
        <BookCover book={entry.book} priority={priority} decorative className="group-hover:shadow-lg" />
        {pct !== null && pct > 0 && (
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-sm bg-black/30">
            <div className="h-full bg-progress" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <H className="mt-3 line-clamp-2 font-sans text-sm leading-snug font-medium text-text-primary">
        <Link
          href={`/books/${entry.id}`}
          className="after:absolute after:inset-0 after:rounded-sm focus-visible:outline-none group-has-[:focus-visible]:underline"
        >
          {entry.book.title}
        </Link>
      </H>
      <p className="mt-0.5 truncate text-xs text-text-tertiary">{formatAuthors(entry.book.authors)}</p>
      {pct !== null && pct > 0 && <p className="sr-only">{pct}% read</p>}
      {showRating && entry.rating && (
        <div className="mt-1">
          <StarDisplay value={entry.rating} size={12} />
        </div>
      )}
    </article>
  );
}

export function BookGrid({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <ul
      aria-label={label}
      className="grid grid-cols-[repeat(auto-fill,minmax(min(42%,8.5rem),1fr))] gap-x-4 gap-y-7 sm:gap-x-6"
    >
      {children}
    </ul>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div aria-hidden className="grid grid-cols-[repeat(auto-fill,minmax(min(42%,8.5rem),1fr))] gap-x-4 gap-y-7 sm:gap-x-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="aspect-[2/3] animate-pulse rounded-sm bg-bg-tertiary" />
          <div className="mt-3 h-3.5 w-4/5 animate-pulse rounded bg-bg-tertiary" />
          <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-bg-tertiary" />
        </div>
      ))}
    </div>
  );
}
