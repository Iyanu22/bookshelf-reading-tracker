import type { Book, LibraryEntry, ProgressEvent } from "@/lib/types";

let seq = 0;

export function book(overrides: Partial<Book> = {}): Book {
  const n = ++seq;
  return {
    key: `test:${n}`,
    title: `Book ${n}`,
    authors: ["Test Author"],
    coverUrl: null,
    pageCount: 300,
    publishedYear: 2000,
    isbn10: null,
    isbn13: null,
    publisher: null,
    description: null,
    genres: ["Fiction"],
    openLibraryId: null,
    ...overrides,
  };
}

export function entry(overrides: Partial<Omit<LibraryEntry, "book">> & { book?: Partial<Book> } = {}): LibraryEntry {
  const { book: bookOverrides, ...rest } = overrides;
  return {
    id: `entry-${++seq}`,
    book: book(bookOverrides),
    shelfId: "shelf-read",
    addedAt: "2026-01-01T00:00:00.000Z",
    startedAt: null,
    finishedAt: null,
    rating: null,
    notes: "",
    progress: null,
    ...rest,
  };
}

export function progressEvent(entryId: string, at: string, percent: number, pagesRead: number | null = null): ProgressEvent {
  return { id: `event-${++seq}`, entryId, at, percent, pagesRead };
}

export const day = (iso: string) => new Date(iso).getTime();
