"use client";

import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatAuthors } from "@/lib/books";
import { useEntry, useShelf, useSortedShelves } from "@/lib/store/hooks";
import { useLibrary } from "@/lib/store/library-store";
import type { Book, LibraryEntry } from "@/lib/types";
import { ProgressBar } from "../ui/ProgressBar";
import { formatDate } from "../ui/RelativeTime";
import { StarRatingInput } from "../ui/StarRating";
import { BookCover } from "./BookCover";
import { progressText, ProgressUpdater } from "./ProgressUpdater";

function externalLink(book: Book) {
  if (book.openLibraryId) return `https://openlibrary.org/works/${book.openLibraryId}`;
  const isbn = book.isbn13 ?? book.isbn10;
  if (isbn) return `https://openlibrary.org/isbn/${isbn}`;
  const q = new URLSearchParams({ title: book.title, author: book.authors[0] ?? "" });
  return `https://openlibrary.org/search?${q}`;
}

/** Long descriptions from APIs sometimes arrive with HTML entities or tags. */
function cleanDescription(text: string) {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function Notes({ entry }: { entry: LibraryEntry }) {
  const setNotes = useLibrary((s) => s.setNotes);
  const [value, setValue] = useState(entry.notes);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(value);

  const save = async (text: string) => {
    if (text === entry.notes) return;
    setState("saving");
    await setNotes(entry.id, text);
    setState("saved");
  };

  // Flush pending edits if the user navigates away mid-typing.
  useEffect(() => {
    const pending = timer;
    const text = latest;
    return () => {
      clearTimeout(pending.current);
      const { entries, setNotes: persist } = useLibrary.getState();
      const current = entries.find((e) => e.id === entry.id);
      if (current && current.notes !== text.current) void persist(entry.id, text.current);
    };
  }, [entry.id]);

  return (
    <section aria-labelledby="notes-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="notes-heading" className="text-lg font-semibold">
          Your notes
        </h2>
        <span aria-live="polite" className="text-xs text-text-tertiary">
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}
        </span>
      </div>
      <label htmlFor="notes" className="sr-only">
        Notes about {entry.book.title}
      </label>
      <textarea
        id="notes"
        value={value}
        rows={5}
        placeholder="Favourite lines, thoughts, who you'd recommend it to…"
        onChange={(e) => {
          setValue(e.target.value);
          latest.current = e.target.value;
          setState("idle");
          clearTimeout(timer.current);
          timer.current = setTimeout(() => save(latest.current), 900);
        }}
        onBlur={() => {
          clearTimeout(timer.current);
          save(latest.current);
        }}
        className="mt-3 w-full resize-y rounded-lg border border-border bg-surface p-4 font-serif text-base leading-relaxed text-text-primary placeholder:font-sans placeholder:text-text-tertiary focus:border-accent focus:outline-none"
      />
    </section>
  );
}

function RemoveButton({ entry }: { entry: LibraryEntry }) {
  const removeEntries = useLibrary((s) => s.removeEntries);
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-error hover:bg-error/10"
      >
        <Trash2 aria-hidden size={15} /> Remove from library
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="remove-title"
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl bg-surface p-6 text-text-primary shadow-lg backdrop:bg-black/40"
      >
        <h2 id="remove-title" className="text-lg font-semibold">
          Remove “{entry.book.title}”?
        </h2>
        <p className="mt-2 text-text-secondary">Your rating, notes and reading progress for this book will be deleted.</p>
        <form method="dialog" className="mt-6 flex justify-end gap-2">
          <button className="h-11 rounded-md px-4 text-text-secondary hover:bg-bg-tertiary">Keep it</button>
          <button
            type="button"
            onClick={async () => {
              dialog.current?.close();
              router.push("/library");
              await removeEntries([entry.id]);
            }}
            className="h-11 rounded-md bg-error px-4 font-semibold text-white"
          >
            Remove book
          </button>
        </form>
      </dialog>
    </>
  );
}

export function BookDetail() {
  const { entryId } = useParams<{ entryId: string }>();
  const status = useLibrary((s) => s.status);
  const entry = useEntry(entryId);
  const shelf = useShelf(entry?.shelfId);
  const shelves = useSortedShelves();
  const moveEntry = useLibrary((s) => s.moveEntry);
  const rate = useLibrary((s) => s.rate);
  const router = useRouter();

  if (status !== "ready") {
    return (
      <div aria-busy="true" className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-[14rem_1fr]">
        <div className="aspect-[2/3] animate-pulse rounded bg-bg-tertiary" />
        <div className="space-y-3">
          <div className="h-9 w-3/4 animate-pulse rounded bg-bg-tertiary" />
          <div className="h-5 w-1/3 animate-pulse rounded bg-bg-tertiary" />
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <title>Book not found — Bookshelf</title>
        <h1 className="text-2xl font-semibold">This book isn&apos;t in your library</h1>
        <p className="mt-2 text-text-secondary">It may have been removed. You can search for it again.</p>
        <Link href="/search" className="mt-6 inline-block font-medium text-accent underline underline-offset-2">
          Search for books
        </Link>
      </div>
    );
  }

  const { book } = entry;
  const meta: [string, string][] = [];
  if (book.pageCount) meta.push(["Pages", String(book.pageCount)]);
  if (book.publishedYear) meta.push(["First published", String(book.publishedYear)]);
  if (book.publisher) meta.push(["Publisher", book.publisher]);
  if (book.isbn13) meta.push(["ISBN-13", book.isbn13]);
  if (book.isbn10) meta.push(["ISBN-10", book.isbn10]);
  const isReading = shelf?.kind === "reading";

  return (
    <article className="mx-auto max-w-4xl">
      <title>{`${book.title} — Bookshelf`}</title>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <ol className="flex flex-wrap items-center gap-1.5 text-text-tertiary">
          <li>
            <button
              type="button"
              onClick={() => (history.length > 1 ? router.back() : router.push("/library"))}
              className="-ml-2 inline-flex h-9 items-center gap-1 rounded px-2 hover:text-text-primary"
            >
              <ArrowLeft aria-hidden size={16} /> Back
            </button>
          </li>
          {shelf && (
            <>
              <li aria-hidden>·</li>
              <li>
                <Link href={`/shelves/${shelf.id}`} className="hover:text-text-primary hover:underline">
                  {shelf.name}
                </Link>
              </li>
            </>
          )}
        </ol>
      </nav>

      <div className="grid gap-8 sm:grid-cols-[minmax(0,14rem)_1fr] lg:grid-cols-[18rem_1fr] lg:gap-12">
        <div className="mx-auto w-48 sm:mx-0 sm:w-full">
          <BookCover book={book} size="lg" priority />
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-semibold text-balance sm:text-3xl">{book.title}</h1>
          <p className="mt-2 text-lg text-text-secondary">{formatAuthors(book.authors)}</p>
          {book.genres.length > 0 && (
            <ul aria-label="Genres" className="mt-4 flex flex-wrap gap-1.5">
              {book.genres.map((g) => (
                <li key={g} className="rounded-sm bg-bg-tertiary px-2 py-0.5 text-xs text-text-secondary">
                  {g}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 grid gap-5 rounded-xl border border-border-subtle bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label htmlFor="shelf" className="block text-xs font-medium text-text-tertiary">
                  Shelf
                </label>
                <select
                  id="shelf"
                  value={entry.shelfId}
                  onChange={(e) => moveEntry(entry.id, e.target.value)}
                  className="mt-1 h-11 rounded-md border border-border bg-surface px-3 font-medium focus:border-accent focus:outline-none"
                >
                  {shelves.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <div>
                  <dt className="text-text-tertiary">Added</dt>
                  <dd>{formatDate(entry.addedAt)}</dd>
                </div>
                {entry.finishedAt && (
                  <div>
                    <dt className="text-text-tertiary">Finished</dt>
                    <dd>{formatDate(entry.finishedAt)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {isReading && (
              <div>
                <ProgressBar
                  size="md"
                  value={entry.progress?.percent ?? 0}
                  label={progressText(entry)}
                  valueText={`${entry.progress?.percent ?? 0}%`}
                />
                <div className="mt-2">
                  <ProgressUpdater entry={entry} />
                </div>
              </div>
            )}

            <div>
              <p aria-hidden className="text-xs font-medium text-text-tertiary">
                Your rating
              </p>
              <StarRatingInput value={entry.rating} onChange={(v) => rate(entry.id, v)} label={`Your rating for ${book.title}`} />
            </div>
          </div>

          {book.description ? (
            <section aria-labelledby="about-heading" className="mt-8">
              <h2 id="about-heading" className="text-lg font-semibold">
                About this book
              </h2>
              <p className="mt-3 font-serif leading-relaxed whitespace-pre-line text-text-secondary">
                {cleanDescription(book.description)}
              </p>
            </section>
          ) : null}

          <div className="mt-8">
            <Notes key={entry.id} entry={entry} />
          </div>

          {meta.length > 0 && (
            <section aria-labelledby="details-heading" className="mt-8">
              <h2 id="details-heading" className="text-lg font-semibold">
                Details
              </h2>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                {meta.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-text-tertiary">{k}</dt>
                    <dd className="text-text-primary">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-6">
            <a
              href={externalLink(book)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              View on Open Library <ExternalLink aria-hidden size={14} />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <RemoveButton entry={entry} />
          </div>
        </div>
      </div>
    </article>
  );
}
