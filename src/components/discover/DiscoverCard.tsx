"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { formatAuthors } from "@/lib/books";
import { useLibrary } from "@/lib/store/library-store";
import type { Book } from "@/lib/types";
import { BookCover } from "../book/BookCover";

/**
 * Discovery is browsing, so adding is one tap straight to "Want to Read" —
 * no shelf picker, no detail page. Readers can move it later; the point here
 * is to capture interest before it fades.
 */
function QuickAdd({ book }: { book: Book }) {
  const existing = useLibrary((s) => s.findExisting(book));
  const shelves = useLibrary((s) => s.shelves);
  const ready = useLibrary((s) => s.status === "ready");
  const addBook = useLibrary((s) => s.addBook);
  const want = shelves.find((s) => s.kind === "want");

  if (existing) {
    const shelf = shelves.find((s) => s.id === existing.shelfId);
    return (
      <Link
        href={`/books/${existing.id}`}
        className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-success hover:underline"
      >
        <Check aria-hidden size={14} /> On {shelf?.name ?? "your shelves"}
        <span className="sr-only">: {book.title}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={!ready || !want}
      onClick={async () => {
        if (!want) return;
        const entry = await addBook(book, want.id);
        if (entry) useLibrary.getState().notify(`Added “${book.title}” to Want to Read.`, "success");
      }}
      className="inline-flex h-11 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-50 lg:h-9"
    >
      <Plus aria-hidden size={14} /> Want to Read<span className="sr-only">: {book.title}</span>
    </button>
  );
}

export function DiscoverCard({ book, priority = false }: { book: Book; priority?: boolean }) {
  return (
    <article className="flex h-full flex-col">
      <div className="transition-transform duration-300 ease-out hover:-translate-y-1 motion-reduce:hover:translate-y-0">
        <BookCover book={book} priority={priority} />
      </div>
      <h3 className="mt-3 line-clamp-2 font-sans text-sm leading-snug font-medium">{book.title}</h3>
      <p className="mt-0.5 truncate text-xs text-text-tertiary">
        {book.authors.length ? formatAuthors(book.authors) : "Author unknown"}
      </p>
      <div className="mt-auto pt-2">
        <QuickAdd book={book} />
      </div>
    </article>
  );
}

export function DiscoverGrid({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-6">
      {children}
    </ul>
  );
}
