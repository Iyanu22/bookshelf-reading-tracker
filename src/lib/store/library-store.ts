"use client";

import { create } from "zustand";
import { bookKey, clampPercent, workSignature } from "../books";
import type { LibraryRepository } from "../data/repository";
import type {
  Book,
  LibraryEntry,
  LibraryMode,
  LibrarySnapshot,
  ProgressEvent,
  ReadingGoal,
  Shelf,
} from "../types";

type Status = "idle" | "loading" | "ready" | "error";

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "success" | "error";
}

interface LibraryState extends LibrarySnapshot {
  status: Status;
  mode: LibraryMode | null;
  /** Calendar year at load time. Read from here (not `new Date()`) so render stays prerender-safe. */
  currentYear: number | null;
  error: string | null;
  toasts: Toast[];

  init(repo: LibraryRepository): Promise<void>;
  notify(message: string, tone?: Toast["tone"]): void;
  dismissToast(id: number): void;

  findExisting(book: Pick<Book, "title" | "authors" | "isbn13" | "openLibraryId">): LibraryEntry | undefined;
  addBook(book: Book, shelfId: string): Promise<LibraryEntry | null>;
  moveEntry(entryId: string, shelfId: string): Promise<void>;
  updateProgress(entryId: string, input: { page?: number; percent?: number }): Promise<{ finished: boolean }>;
  rate(entryId: string, rating: number | null): Promise<void>;
  setNotes(entryId: string, notes: string): Promise<void>;
  setGenres(entryId: string, genres: string[]): Promise<void>;
  removeEntries(ids: string[]): Promise<void>;

  createShelf(name: string): Promise<Shelf | null>;
  renameShelf(id: string, name: string): Promise<void>;
  deleteShelf(id: string): Promise<void>;
  reorderShelves(orderedIds: string[]): Promise<void>;

  setGoal(year: number, target: number): Promise<void>;
}

let repo: LibraryRepository | null = null;
let toastSeq = 0;

const now = () => new Date().toISOString();
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const snapshotOf = (s: LibrarySnapshot): LibrarySnapshot => ({
  shelves: s.shelves,
  entries: s.entries,
  goals: s.goals,
  progressEvents: s.progressEvents,
});

export const useLibrary = create<LibraryState>()((set, get) => {
  /**
   * Optimistic update: apply `change` immediately, persist in the background,
   * and restore the previous snapshot with a specific message if it fails.
   */
  async function mutate(
    change: (s: LibraryState) => Partial<LibrarySnapshot>,
    persist: (r: LibraryRepository) => Promise<void>,
    failure: string,
  ) {
    const before = snapshotOf(get());
    set(change(get()));
    repo?.saveSnapshot?.(snapshotOf(get()));
    try {
      if (repo) await persist(repo);
    } catch (err) {
      console.error(err);
      set(before);
      repo?.saveSnapshot?.(before);
      get().notify(failure, "error");
    }
  }

  const patchEntry = (id: string, patch: Partial<LibraryEntry>) => (s: LibraryState) => ({
    entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  });

  const shelfKind = (id: string) => get().shelves.find((s) => s.id === id)?.kind;

  return {
    shelves: [],
    entries: [],
    goals: [],
    progressEvents: [],
    status: "idle",
    mode: null,
    currentYear: null,
    error: null,
    toasts: [],

    async init(repository) {
      if (repo === repository && get().status === "ready") return;
      repo = repository;
      set({ status: "loading", mode: repository.mode, error: null });
      try {
        const snapshot = await repository.load();
        set({ ...snapshot, status: "ready", currentYear: new Date().getFullYear() });
      } catch (err) {
        console.error(err);
        set({
          status: "error",
          error: "We couldn't load your library. Check your connection and try again.",
        });
      }
    },

    notify(message, tone = "info") {
      const id = ++toastSeq;
      set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
      setTimeout(() => get().dismissToast(id), 5000);
    },

    dismissToast(id) {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    findExisting(book) {
      const key = bookKey(book);
      const sig = workSignature(book);
      return get().entries.find((e) => e.book.key === key || workSignature(e.book) === sig);
    },

    async addBook(book, shelfId) {
      const existing = get().findExisting(book);
      if (existing) {
        get().notify(`“${book.title}” is already in your library.`, "info");
        return null;
      }
      const kind = shelfKind(shelfId);
      const ts = now();
      const entry: LibraryEntry = {
        id: uid(),
        book: { ...book, key: bookKey(book) },
        shelfId,
        addedAt: ts,
        startedAt: kind === "reading" || kind === "read" ? ts : null,
        finishedAt: kind === "read" ? ts : null,
        rating: null,
        notes: "",
        progress:
          kind === "reading"
            ? { currentPage: book.pageCount ? 0 : null, percent: 0, updatedAt: ts }
            : kind === "read"
              ? { currentPage: book.pageCount, percent: 100, updatedAt: ts }
              : null,
      };
      await mutate(
        (s) => ({ entries: [entry, ...s.entries] }),
        (r) => r.addEntry(entry),
        `Couldn't add “${book.title}”. Please try again.`,
      );
      return entry;
    },

    async moveEntry(entryId, shelfId) {
      const entry = get().entries.find((e) => e.id === entryId);
      if (!entry || entry.shelfId === shelfId) return;
      const kind = shelfKind(shelfId);
      const ts = now();
      const patch: Partial<LibraryEntry> = { shelfId };
      if (kind === "reading") {
        patch.startedAt = entry.startedAt ?? ts;
        patch.finishedAt = null;
        patch.progress = entry.progress && entry.progress.percent < 100
          ? entry.progress
          : { currentPage: entry.book.pageCount ? 0 : null, percent: 0, updatedAt: ts };
      } else if (kind === "read") {
        patch.startedAt = entry.startedAt ?? ts;
        patch.finishedAt = entry.finishedAt ?? ts;
        patch.progress = { currentPage: entry.book.pageCount, percent: 100, updatedAt: ts };
      } else if (kind === "want") {
        patch.finishedAt = null;
        patch.progress = null;
      }
      await mutate(
        patchEntry(entryId, patch),
        (r) => r.updateEntry(entryId, patch),
        `Couldn't move “${entry.book.title}”. It's back where it was.`,
      );
    },

    async updateProgress(entryId, input) {
      const entry = get().entries.find((e) => e.id === entryId);
      if (!entry) return { finished: false };
      const pages = entry.book.pageCount;
      let currentPage: number | null = null;
      let percent: number;
      if (pages && input.page !== undefined) {
        currentPage = Math.min(pages, Math.max(0, Math.round(input.page)));
        percent = clampPercent((currentPage / pages) * 100);
      } else {
        percent = clampPercent(input.percent ?? 0);
        currentPage = pages ? Math.round((pages * percent) / 100) : null;
      }
      const prevPercent = entry.progress?.percent ?? 0;
      const ts = now();
      const progress = { currentPage, percent, updatedAt: ts };
      const event: ProgressEvent = {
        id: uid(),
        entryId,
        at: ts,
        pagesRead: pages ? Math.max(0, (currentPage ?? 0) - (entry.progress?.currentPage ?? 0)) : null,
        percent,
      };
      const patch: Partial<LibraryEntry> = { progress, startedAt: entry.startedAt ?? ts };
      await mutate(
        (s) => ({
          ...patchEntry(entryId, patch)(s),
          progressEvents: percent !== prevPercent ? [...s.progressEvents, event] : s.progressEvents,
        }),
        async (r) => {
          await r.updateEntry(entryId, patch);
          if (percent !== prevPercent) await r.addProgressEvent(event);
        },
        "Couldn't save your progress. Your last saved page is restored.",
      );
      return { finished: percent >= 100 };
    },

    async rate(entryId, rating) {
      await mutate(patchEntry(entryId, { rating }), (r) => r.updateEntry(entryId, { rating }), "Couldn't save that rating.");
    },

    async setNotes(entryId, notes) {
      await mutate(patchEntry(entryId, { notes }), (r) => r.updateEntry(entryId, { notes }), "Couldn't save your notes.");
    },

    async setGenres(entryId, genres) {
      await mutate(
        (s) => ({
          entries: s.entries.map((e) => (e.id === entryId ? { ...e, book: { ...e.book, genres } } : e)),
        }),
        (r) => r.updateBookGenres(entryId, genres),
        "Couldn't update genres.",
      );
    },

    async removeEntries(ids) {
      const set_ = new Set(ids);
      await mutate(
        (s) => ({
          entries: s.entries.filter((e) => !set_.has(e.id)),
          progressEvents: s.progressEvents.filter((ev) => !set_.has(ev.entryId)),
        }),
        (r) => r.removeEntries(ids),
        "Couldn't remove those books. Nothing was deleted.",
      );
    },

    async createShelf(name) {
      const trimmed = name.trim();
      if (!trimmed) return null;
      if (get().shelves.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
        get().notify(`You already have a shelf called “${trimmed}”.`, "error");
        return null;
      }
      const shelf: Shelf = {
        id: uid(),
        name: trimmed,
        kind: "custom",
        position: Math.max(-1, ...get().shelves.map((s) => s.position)) + 1,
      };
      await mutate((s) => ({ shelves: [...s.shelves, shelf] }), (r) => r.upsertShelf(shelf), "Couldn't create that shelf.");
      return shelf;
    },

    async renameShelf(id, name) {
      const shelf = get().shelves.find((s) => s.id === id);
      const trimmed = name.trim();
      if (!shelf || shelf.kind !== "custom" || !trimmed) return;
      const next = { ...shelf, name: trimmed };
      await mutate(
        (s) => ({ shelves: s.shelves.map((x) => (x.id === id ? next : x)) }),
        (r) => r.upsertShelf(next),
        "Couldn't rename that shelf.",
      );
    },

    async deleteShelf(id) {
      const shelf = get().shelves.find((s) => s.id === id);
      const fallback = get().shelves.find((s) => s.kind === "want");
      if (!shelf || shelf.kind !== "custom" || !fallback) return;
      // Books are never lost with a shelf — they move to "Want to Read".
      await mutate(
        (s) => ({
          shelves: s.shelves.filter((x) => x.id !== id),
          entries: s.entries.map((e) => (e.shelfId === id ? { ...e, shelfId: fallback.id } : e)),
        }),
        (r) => r.deleteShelf(id, fallback.id),
        `Couldn't delete “${shelf.name}”.`,
      );
    },

    async reorderShelves(orderedIds) {
      const positions = orderedIds.map((id, position) => ({ id, position }));
      await mutate(
        (s) => ({
          shelves: s.shelves
            .map((x) => ({ ...x, position: orderedIds.indexOf(x.id) }))
            .sort((a, b) => a.position - b.position),
        }),
        (r) => r.reorderShelves(positions),
        "Couldn't save the new shelf order.",
      );
    },

    async setGoal(year, target) {
      const goal: ReadingGoal = { year, target: Math.max(1, Math.round(target)) };
      await mutate(
        (s) => ({ goals: [...s.goals.filter((g) => g.year !== year), goal] }),
        (r) => r.setGoal(goal),
        "Couldn't save your reading goal.",
      );
    },
  };
});

/* ----------------------------- selectors ----------------------------- */

export const selectSortedShelves = (s: LibrarySnapshot) => [...s.shelves].sort((a, b) => a.position - b.position);

export function countByShelf(entries: LibraryEntry[]) {
  const counts: Record<string, number> = {};
  for (const e of entries) counts[e.shelfId] = (counts[e.shelfId] ?? 0) + 1;
  return counts;
}
