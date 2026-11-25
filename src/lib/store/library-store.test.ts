import { beforeEach, describe, expect, it } from "vitest";
import { entry } from "@/test/factories";
import type { LibraryRepository } from "../data/repository";
import type { LibrarySnapshot } from "../types";
import { useLibrary } from "./library-store";

/** A promise the test settles by hand, to finish saves in whatever order it wants. */
function deferred() {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

const book = entry({ id: "e1", book: { pageCount: 300 }, shelfId: "reading", startedAt: "2026-11-01T00:00:00Z" });

function snapshot(): LibrarySnapshot {
  return {
    shelves: [{ id: "reading", name: "Currently Reading", kind: "reading", position: 0 }],
    entries: [structuredClone(book)],
    goals: [],
    progressEvents: [],
  };
}

/** Fake repository: every updateEntry call waits on a deferred the test controls. */
function fakeRepo() {
  const calls: { patch: object; save: ReturnType<typeof deferred> }[] = [];
  const ok = async () => {};
  const repo: LibraryRepository = {
    mode: "account",
    load: async () => snapshot(),
    addEntry: ok,
    updateEntry: (_id, patch) => {
      const save = deferred();
      calls.push({ patch, save });
      return save.promise;
    },
    updateBookGenres: ok,
    removeEntries: ok,
    upsertShelf: ok,
    deleteShelf: ok,
    reorderShelves: ok,
    setGoal: ok,
    addProgressEvent: ok,
  };
  return { repo, calls };
}

const current = () => useLibrary.getState().entries[0];

describe("optimistic updates", () => {
  let calls: ReturnType<typeof fakeRepo>["calls"];

  beforeEach(async () => {
    const fake = fakeRepo();
    calls = fake.calls;
    useLibrary.setState({ toasts: [] });
    await useLibrary.getState().init(fake.repo);
  });

  it("shows a change immediately and keeps it once saved", async () => {
    const done = useLibrary.getState().rate("e1", 4);
    expect(current().rating).toBe(4);
    calls[0].save.resolve();
    await done;
    expect(current().rating).toBe(4);
  });

  it("rolls back a failed change and says so", async () => {
    const done = useLibrary.getState().rate("e1", 4);
    calls[0].save.reject(new Error("offline"));
    await done;
    expect(current().rating).toBeNull();
    expect(useLibrary.getState().toasts.at(-1)?.tone).toBe("error");
  });

  it("undoes only the failed change when saves overlap and finish out of order", async () => {
    const rating = useLibrary.getState().rate("e1", 4); // slow, will fail
    const notes = useLibrary.getState().setNotes("e1", "Loved the ending"); // fast, succeeds
    expect(current()).toMatchObject({ rating: 4, notes: "Loved the ending" });

    calls[1].save.resolve();
    await notes;
    calls[0].save.reject(new Error("timeout"));
    await rating;

    // The rating is undone; the note that saved in the meantime survives.
    expect(current()).toMatchObject({ rating: null, notes: "Loved the ending" });
  });

  it("keeps an earlier saved change when a later one fails", async () => {
    const rating = useLibrary.getState().rate("e1", 5);
    const notes = useLibrary.getState().setNotes("e1", "draft");
    calls[0].save.resolve();
    calls[1].save.reject(new Error("timeout"));
    await Promise.all([rating, notes]);
    expect(current()).toMatchObject({ rating: 5, notes: "" });
  });
});

describe("updateProgress", () => {
  let calls: ReturnType<typeof fakeRepo>["calls"];

  beforeEach(async () => {
    const fake = fakeRepo();
    calls = fake.calls;
    await useLibrary.getState().init(fake.repo);
  });

  it("reports the book as finished once the last page is saved", async () => {
    const result = useLibrary.getState().updateProgress("e1", { page: 300 });
    calls[0].save.resolve();
    expect(await result).toEqual({ finished: true });
  });

  it("doesn't offer 'Mark as read' when saving the last page fails", async () => {
    const result = useLibrary.getState().updateProgress("e1", { page: 300 });
    calls[0].save.reject(new Error("offline"));
    expect(await result).toEqual({ finished: false });
    expect(current().progress).toBeNull();
  });
});
