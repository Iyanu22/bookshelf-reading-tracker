import type {
  LibraryEntry,
  LibraryMode,
  LibrarySnapshot,
  ProgressEvent,
  ReadingGoal,
  Shelf,
} from "../types";

/**
 * Persistence boundary. The store applies every change optimistically and
 * then asks the repository to persist it; if that fails, the store rolls back.
 *
 * - Guest mode: session-scoped, seeded from the curated sample library.
 * - Account mode: Supabase (Postgres + row-level security).
 */
export interface LibraryRepository {
  readonly mode: LibraryMode;
  load(): Promise<LibrarySnapshot>;
  addEntry(entry: LibraryEntry): Promise<void>;
  updateEntry(id: string, patch: Partial<Omit<LibraryEntry, "id" | "book">>): Promise<void>;
  updateBookGenres(entryId: string, genres: string[]): Promise<void>;
  removeEntries(ids: string[]): Promise<void>;
  upsertShelf(shelf: Shelf): Promise<void>;
  /** Deletes a custom shelf after its books have been moved to `fallbackShelfId`. */
  deleteShelf(id: string, fallbackShelfId: string): Promise<void>;
  reorderShelves(shelves: Pick<Shelf, "id" | "position">[]): Promise<void>;
  setGoal(goal: ReadingGoal): Promise<void>;
  addProgressEvent(event: ProgressEvent): Promise<void>;
  /** Guest mode only: persist the whole snapshot (cheap, session-scoped). */
  saveSnapshot?(snapshot: LibrarySnapshot): void;
}
