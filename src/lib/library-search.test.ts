import { describe, expect, it } from "vitest";
import { entry } from "@/test/factories";
import { searchLibrary } from "./library-search";

const leftHand = entry({ book: { title: "The Left Hand of Darkness", authors: ["Ursula K. Le Guin"] } });
const dispossessed = entry({ book: { title: "The Dispossessed", authors: ["Ursula K. Le Guin"] } });
const solitude = entry({ book: { title: "One Hundred Years of Solitude", authors: ["Gabriel García Márquez"] } });
const mockingbird = entry({
  book: { title: "To Kill a Mockingbird", authors: ["Harper Lee"] },
  notes: "Picked this up for book club after years of meaning to. The courtroom chapters are the heart of it, and Atticus never stops being decent.",
});
const library = [leftHand, dispossessed, solitude, mockingbird];

describe("searchLibrary", () => {
  it("returns nothing for an empty or whitespace query", () => {
    expect(searchLibrary(library, "")).toEqual([]);
    expect(searchLibrary(library, "   ")).toEqual([]);
  });

  it("requires every word to match, across title and author", () => {
    const ids = searchLibrary(library, "le guin dark").map((m) => m.entry.id);
    expect(ids).toEqual([leftHand.id]);
  });

  it("ignores accents and case", () => {
    expect(searchLibrary(library, "GARCIA marquez").map((m) => m.entry.id)).toEqual([solitude.id]);
  });

  it("finds books through the reader's notes and explains the hit with a snippet", () => {
    const [hit] = searchLibrary(library, "courtroom");
    expect(hit.entry.id).toBe(mockingbird.id);
    expect(hit.field).toBe("notes");
    expect(hit.snippet).toContain("courtroom");
    // The snippet starts mid-note, snapped to a word boundary.
    expect(hit.snippet?.startsWith("…")).toBe(true);
    expect(hit.snippet?.slice(1, 2)).not.toBe(" ");
  });

  it("ranks title matches above author-only matches", () => {
    const ids = searchLibrary(library, "dispossessed").map((m) => m.entry.id);
    expect(ids[0]).toBe(dispossessed.id);
    const byAuthor = searchLibrary(library, "guin").map((m) => m.entry.id);
    expect(byAuthor).toEqual(expect.arrayContaining([leftHand.id, dispossessed.id]));
    expect(searchLibrary(library, "guin").every((m) => m.field === "author")).toBe(true);
  });
});
