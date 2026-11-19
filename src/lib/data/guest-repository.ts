import { buildGuestLibrary } from "../seed/guest-seed";
import type { LibrarySnapshot } from "../types";
import type { LibraryRepository } from "./repository";

const STORAGE_KEY = "bookshelf-guest-library-v1";
const noop = async () => {};

/**
 * Guest data lives in sessionStorage: it survives reloads and in-app
 * navigation, but disappears when the tab is closed — exactly the
 * "explore freely, sign up to keep it" contract from the spec.
 */
export class GuestRepository implements LibraryRepository {
  readonly mode = "guest" as const;

  async load(): Promise<LibrarySnapshot> {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as LibrarySnapshot;
    } catch {
      // Corrupt or unavailable storage — fall through to a fresh seed.
    }
    const seeded = buildGuestLibrary();
    this.saveSnapshot(seeded);
    return seeded;
  }

  saveSnapshot(snapshot: LibrarySnapshot) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Storage full or disabled (private mode) — the session still works in memory.
    }
  }

  static clear() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  addEntry = noop;
  updateEntry = noop;
  updateBookGenres = noop;
  removeEntries = noop;
  upsertShelf = noop;
  deleteShelf = noop;
  reorderShelves = noop;
  setGoal = noop;
  addProgressEvent = noop;
}
