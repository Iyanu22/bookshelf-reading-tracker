"use client";

import { Check, Pencil, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useShelf } from "@/lib/store/hooks";
import { useLibrary } from "@/lib/store/library-store";
import type { LibraryEntry, Shelf } from "@/lib/types";
import { BookGrid, BookTile, GridSkeleton } from "../book/BookTile";

type SortKey = "added" | "title" | "author" | "read" | "rating";

const SORTS: Record<SortKey, { label: string; fn: (a: LibraryEntry, b: LibraryEntry) => number }> = {
  added: { label: "Date added", fn: (a, b) => b.addedAt.localeCompare(a.addedAt) },
  title: { label: "Title", fn: (a, b) => a.book.title.localeCompare(b.book.title) },
  author: {
    label: "Author",
    fn: (a, b) => {
      const last = (e: LibraryEntry) => (e.book.authors[0] ?? "").split(" ").at(-1) ?? "";
      return last(a).localeCompare(last(b)) || a.book.title.localeCompare(b.book.title);
    },
  },
  read: {
    label: "Date read",
    fn: (a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? "") || b.addedAt.localeCompare(a.addedAt),
  },
  rating: { label: "Rating", fn: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.book.title.localeCompare(b.book.title) },
};

const PAGE_SIZE = 48;

function Select({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-text-tertiary">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 min-w-0 rounded-md border border-border bg-surface px-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
      >
        {children}
      </select>
    </div>
  );
}

function ShelfHeader({ shelf, count }: { shelf: Shelf | null; count: number }) {
  const renameShelf = useLibrary((s) => s.renameShelf);
  const deleteShelf = useLibrary((s) => s.deleteShelf);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(shelf?.name ?? "");
  const dialog = useRef<HTMLDialogElement>(null);
  const title = shelf?.name ?? "All Books";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {editing && shelf ? (
        <form
          className="flex items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await renameShelf(shelf.id, name);
            setEditing(false);
          }}
        >
          <label htmlFor="rename-shelf" className="sr-only">
            Shelf name
          </label>
          <input
            id="rename-shelf"
            value={name}
            maxLength={60}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            className="h-11 rounded-md border border-border bg-surface px-3 font-heading text-xl focus:border-accent focus:outline-none"
          />
          <button type="submit" aria-label="Save shelf name" className="grid size-11 place-items-center rounded-md bg-accent text-bg-primary">
            <Check aria-hidden size={18} />
          </button>
          <button
            type="button"
            aria-label="Cancel renaming"
            onClick={() => setEditing(false)}
            className="grid size-11 place-items-center rounded-md hover:bg-bg-tertiary"
          >
            <X aria-hidden size={18} />
          </button>
        </form>
      ) : (
        <h1 className="text-xl font-semibold sm:text-2xl">
          {title} <span className="font-sans text-base font-normal text-text-tertiary">{count} {count === 1 ? "book" : "books"}</span>
        </h1>
      )}

      {shelf?.kind === "custom" && !editing && (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              setName(shelf.name);
              setEditing(true);
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-text-secondary hover:bg-bg-tertiary"
          >
            <Pencil aria-hidden size={15} /> Rename
          </button>
          <button
            type="button"
            onClick={() => dialog.current?.showModal()}
            className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-error hover:bg-error/10"
          >
            <Trash2 aria-hidden size={15} /> Delete
          </button>
          <dialog
            ref={dialog}
            aria-labelledby="delete-shelf-title"
            className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl bg-surface p-6 text-text-primary shadow-lg backdrop:bg-black/40"
          >
            <h2 id="delete-shelf-title" className="text-lg font-semibold">
              Delete “{shelf.name}”?
            </h2>
            <p className="mt-2 text-text-secondary">
              {count > 0
                ? `The ${count} ${count === 1 ? "book" : "books"} on this shelf will move to Want to Read — nothing is removed from your library.`
                : "This shelf is empty, so nothing else changes."}
            </p>
            <form method="dialog" className="mt-6 flex justify-end gap-2">
              <button className="h-11 rounded-md px-4 text-text-secondary hover:bg-bg-tertiary">Keep shelf</button>
              <button
                type="button"
                onClick={async () => {
                  dialog.current?.close();
                  await deleteShelf(shelf.id);
                  router.push("/library");
                }}
                className="h-11 rounded-md bg-error px-4 font-semibold text-white"
              >
                Delete shelf
              </button>
            </form>
          </dialog>
        </div>
      )}
    </div>
  );
}

export function ShelfView() {
  const { shelfId } = useParams<{ shelfId: string }>();
  const isAll = shelfId === "all";
  const status = useLibrary((s) => s.status);
  const entries = useLibrary((s) => s.entries);
  const shelves = useLibrary((s) => s.shelves);
  const shelf = useShelf(isAll ? undefined : shelfId) ?? null;

  const defaultSort: SortKey = shelf?.kind === "read" ? "read" : "added";
  const [sort, setSort] = useState<SortKey | null>(null);
  const [genre, setGenre] = useState("");
  const [author, setAuthor] = useState("");
  const [minRating, setMinRating] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const activeSort = sort ?? defaultSort;

  const onShelf = useMemo(() => (isAll ? entries : entries.filter((e) => e.shelfId === shelfId)), [entries, isAll, shelfId]);

  const { genres, authors } = useMemo(() => {
    const g = new Set<string>();
    const a = new Set<string>();
    for (const e of onShelf) {
      e.book.genres.forEach((x) => g.add(x));
      e.book.authors.forEach((x) => a.add(x));
    }
    return { genres: [...g].sort(), authors: [...a].sort() };
  }, [onShelf]);

  const visible = useMemo(() => {
    const min = Number(minRating) || 0;
    return onShelf
      .filter((e) => (!genre || e.book.genres.includes(genre)) && (!author || e.book.authors.includes(author)) && (e.rating ?? 0) >= min)
      .sort(SORTS[activeSort].fn);
  }, [onShelf, genre, author, minRating, activeSort]);

  if (status !== "ready") {
    return (
      <div className="mx-auto max-w-library" aria-busy="true">
        <div className="h-9 w-56 animate-pulse rounded bg-bg-tertiary" />
        <div className="mt-8">
          <GridSkeleton />
        </div>
      </div>
    );
  }

  if (!isAll && !shelf) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <title>Shelf not found — Bookshelf</title>
        <h1 className="text-2xl font-semibold">This shelf doesn&apos;t exist</h1>
        <p className="mt-2 text-text-secondary">It may have been deleted or renamed. Your books are safe.</p>
        <Link href="/library" className="mt-6 inline-block font-medium text-accent underline underline-offset-2">
          Back to your library
        </Link>
      </div>
    );
  }

  const filtersActive = Boolean(genre || author || minRating);
  const shelfName = shelf?.name ?? "All Books";
  const shelfCount = shelves.length;

  return (
    <div className="mx-auto max-w-library">
      <title>{`${shelfName} — Bookshelf`}</title>
      <ShelfHeader key={shelf?.id ?? "all"} shelf={shelf} count={onShelf.length} />

      {onShelf.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <p className="font-heading text-lg">No books on this shelf yet.</p>
          <p className="mt-1 text-text-secondary">
            {shelfCount > 1 ? "Search for books to add, or move books here from their detail page." : "Search for books to add."}
          </p>
          <Link
            href="/search"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 font-semibold text-bg-primary hover:bg-accent-hover"
          >
            <Search aria-hidden size={18} /> Find books
          </Link>
        </div>
      ) : (
        <>
          <div role="group" aria-label="Sort and filter" className="mt-6 grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
            <Select id="sort" label="Sort by" value={activeSort} onChange={(v) => setSort(v as SortKey)}>
              {(Object.keys(SORTS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORTS[k].label}
                </option>
              ))}
            </Select>
            <Select id="genre" label="Genre" value={genre} onChange={setGenre}>
              <option value="">All genres</option>
              {genres.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
            <Select id="author" label="Author" value={author} onChange={setAuthor}>
              <option value="">All authors</option>
              {authors.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
            <Select id="rating" label="Rating" value={minRating} onChange={setMinRating}>
              <option value="">Any rating</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r === 5 ? "5 stars" : `${r}+ stars`}
                </option>
              ))}
            </Select>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setGenre("");
                  setAuthor("");
                  setMinRating("");
                }}
                className="h-10 rounded-md px-3 text-sm font-medium text-accent hover:bg-accent-subtle"
              >
                Clear filters
              </button>
            )}
          </div>

          <p aria-live="polite" className="mt-4 text-sm text-text-tertiary">
            {filtersActive ? `Showing ${visible.length} of ${onShelf.length} books` : ""}
          </p>

          {visible.length === 0 ? (
            <p className="mt-6 text-text-secondary">No books match these filters. Try clearing one.</p>
          ) : (
            <div className="mt-4">
              <BookGrid label={`${shelfName} books`}>
                {visible.slice(0, limit).map((e, i) => (
                  <li key={e.id}>
                    <BookTile entry={e} priority={i < 6} headingLevel={2} />
                  </li>
                ))}
              </BookGrid>
              {visible.length > limit && (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + PAGE_SIZE)}
                    className="h-11 rounded-md border border-border px-5 font-medium hover:bg-bg-tertiary"
                  >
                    Show more ({visible.length - limit} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
