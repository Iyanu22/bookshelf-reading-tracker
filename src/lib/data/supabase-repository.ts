import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Book,
  LibraryEntry,
  LibrarySnapshot,
  ProgressEvent,
  ReadingGoal,
  Shelf,
  ShelfKind,
} from "../types";
import type { LibraryRepository } from "./repository";

interface BookRow {
  id: string;
  key: string;
  title: string;
  authors: string[];
  cover_url: string | null;
  page_count: number | null;
  published_year: number | null;
  isbn10: string | null;
  isbn13: string | null;
  publisher: string | null;
  description: string | null;
  genres: string[];
  open_library_id: string | null;
}

interface EntryRow {
  id: string;
  shelf_id: string;
  added_at: string;
  started_at: string | null;
  finished_at: string | null;
  rating: number | null;
  notes: string;
  genres: string[] | null;
  current_page: number | null;
  progress_percent: number | null;
  progress_updated_at: string | null;
  book: BookRow;
}

const toBook = (r: BookRow, genres: string[] | null): Book => ({
  key: r.key,
  title: r.title,
  authors: r.authors,
  coverUrl: r.cover_url,
  pageCount: r.page_count,
  publishedYear: r.published_year,
  isbn10: r.isbn10,
  isbn13: r.isbn13,
  publisher: r.publisher,
  description: r.description,
  genres: genres ?? r.genres,
  openLibraryId: r.open_library_id,
});

const toEntry = (r: EntryRow): LibraryEntry => ({
  id: r.id,
  book: toBook(r.book, r.genres),
  shelfId: r.shelf_id,
  addedAt: r.added_at,
  startedAt: r.started_at,
  finishedAt: r.finished_at,
  rating: r.rating,
  notes: r.notes,
  progress:
    r.progress_percent === null
      ? null
      : { currentPage: r.current_page, percent: r.progress_percent, updatedAt: r.progress_updated_at ?? r.added_at },
});

function entryPatchToRow(patch: Partial<LibraryEntry>) {
  const row: Record<string, unknown> = {};
  if ("shelfId" in patch) row.shelf_id = patch.shelfId;
  if ("startedAt" in patch) row.started_at = patch.startedAt;
  if ("finishedAt" in patch) row.finished_at = patch.finishedAt;
  if ("rating" in patch) row.rating = patch.rating;
  if ("notes" in patch) row.notes = patch.notes;
  if ("progress" in patch) {
    row.current_page = patch.progress?.currentPage ?? null;
    row.progress_percent = patch.progress?.percent ?? null;
    row.progress_updated_at = patch.progress?.updatedAt ?? null;
  }
  return row;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Like `check`, for queries that must return rows (lists or `.single()`). */
function rows<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  const data = check(res);
  if (data === null || data === undefined) throw new Error("Expected data from Supabase but got none");
  return data;
}

export class SupabaseRepository implements LibraryRepository {
  readonly mode = "account" as const;

  constructor(
    private db: SupabaseClient,
    private userId: string,
  ) {}

  async load(): Promise<LibrarySnapshot> {
    const [shelves, entries, goals, events] = await Promise.all([
      this.db.from("shelves").select("id, name, kind, position").order("position"),
      this.db
        .from("library_entries")
        .select(
          "id, shelf_id, added_at, started_at, finished_at, rating, notes, genres, current_page, progress_percent, progress_updated_at, book:books(*)",
        )
        .order("added_at", { ascending: false }),
      this.db.from("reading_goals").select("year, target"),
      this.db.from("progress_events").select("id, entry_id, at, pages_read, percent").order("at"),
    ]);
    return {
      shelves: rows(shelves).map((s) => ({ ...s, kind: s.kind as ShelfKind })),
      entries: (rows(entries) as unknown as EntryRow[]).map(toEntry),
      goals: rows(goals),
      progressEvents: rows(events).map((e) => ({
        id: e.id,
        entryId: e.entry_id,
        at: e.at,
        pagesRead: e.pages_read,
        percent: e.percent,
      })),
    };
  }

  /** Upsert into the shared catalog and return its id. */
  private async ensureBook(book: Book): Promise<string> {
    const existing = check(await this.db.from("books").select("id").eq("key", book.key).maybeSingle());
    if (existing) return existing.id;
    const inserted = rows(
      await this.db
        .from("books")
        .insert({
          key: book.key,
          title: book.title,
          authors: book.authors,
          cover_url: book.coverUrl,
          page_count: book.pageCount,
          published_year: book.publishedYear,
          isbn10: book.isbn10,
          isbn13: book.isbn13,
          publisher: book.publisher,
          description: book.description,
          genres: book.genres,
          open_library_id: book.openLibraryId,
        })
        .select("id")
        .single(),
    );
    return inserted.id;
  }

  async addEntry(entry: LibraryEntry) {
    const bookId = await this.ensureBook(entry.book);
    check(
      await this.db.from("library_entries").insert({
        id: entry.id,
        user_id: this.userId,
        book_id: bookId,
        added_at: entry.addedAt,
        ...entryPatchToRow(entry),
      }),
    );
  }

  async updateEntry(id: string, patch: Partial<LibraryEntry>) {
    check(await this.db.from("library_entries").update(entryPatchToRow(patch)).eq("id", id));
  }

  async updateBookGenres(entryId: string, genres: string[]) {
    check(await this.db.from("library_entries").update({ genres }).eq("id", entryId));
  }

  async removeEntries(ids: string[]) {
    check(await this.db.from("library_entries").delete().in("id", ids));
  }

  async upsertShelf(shelf: Shelf) {
    check(await this.db.from("shelves").upsert({ ...shelf, user_id: this.userId }));
  }

  async deleteShelf(id: string, fallbackShelfId: string) {
    check(await this.db.rpc("delete_shelf", { p_shelf_id: id, p_fallback_shelf_id: fallbackShelfId }));
  }

  async reorderShelves(shelves: Pick<Shelf, "id" | "position">[]) {
    await Promise.all(
      shelves.map(async (s) => check(await this.db.from("shelves").update({ position: s.position }).eq("id", s.id))),
    );
  }

  async setGoal(goal: ReadingGoal) {
    check(await this.db.from("reading_goals").upsert({ ...goal, user_id: this.userId }));
  }

  async addProgressEvent(e: ProgressEvent) {
    check(
      await this.db.from("progress_events").insert({
        id: e.id,
        user_id: this.userId,
        entry_id: e.entryId,
        at: e.at,
        pages_read: e.pagesRead,
        percent: e.percent,
      }),
    );
  }
}
