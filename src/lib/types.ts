/** Normalized book metadata — what we know about a book regardless of who owns it. */
export interface Book {
  /** Stable identity used for de-duplication (see `bookKey`). */
  key: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  pageCount: number | null;
  publishedYear: number | null;
  isbn10: string | null;
  isbn13: string | null;
  publisher: string | null;
  description: string | null;
  genres: string[];
  /** Open Library work id (e.g. "OL45883W") when known. */
  openLibraryId: string | null;
}

export type DefaultShelfKind = "want" | "reading" | "read";
export type ShelfKind = DefaultShelfKind | "custom";

export interface Shelf {
  id: string;
  name: string;
  kind: ShelfKind;
  position: number;
}

export interface ReadingProgress {
  /** Current page — null when the book has no page count (percentage mode). */
  currentPage: number | null;
  /** 0–100. Always populated so every book can render a bar. */
  percent: number;
  updatedAt: string;
}

/** A book in the user's library. A book lives on exactly one shelf. */
export interface LibraryEntry {
  id: string;
  book: Book;
  shelfId: string;
  addedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  rating: number | null;
  notes: string;
  progress: ReadingProgress | null;
}

/** One progress update — kept as history so stats can show pace over time. */
export interface ProgressEvent {
  id: string;
  entryId: string;
  at: string;
  /** Pages read in this update (delta), when known. */
  pagesRead: number | null;
  percent: number;
}

export interface ReadingGoal {
  year: number;
  target: number;
}

export interface LibrarySnapshot {
  shelves: Shelf[];
  entries: LibraryEntry[];
  goals: ReadingGoal[];
  progressEvents: ProgressEvent[];
}

export type LibraryMode = "guest" | "account";
