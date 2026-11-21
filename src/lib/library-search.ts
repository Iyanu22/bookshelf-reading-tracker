import type { LibraryEntry } from "./types";

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");

export interface LibraryMatch {
  entry: LibraryEntry;
  /** Where the best hit was, so results can explain themselves ("in your notes"). */
  field: "title" | "author" | "notes";
  /** A short excerpt around the hit when it came from the reader's notes. */
  snippet?: string;
}

/**
 * Searches the reader's own library: titles, authors and personal notes.
 * Every word must match somewhere (so "le guin dark" finds The Left Hand of
 * Darkness). Accent-insensitive. Runs in memory — instant for thousands of books.
 */
export function searchLibrary(entries: LibraryEntry[], query: string): LibraryMatch[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const scored: (LibraryMatch & { score: number })[] = [];
  for (const entry of entries) {
    const title = fold(entry.book.title);
    const author = fold(entry.book.authors.join(" "));
    const notes = fold(entry.notes);
    const all = `${title} ${author} ${notes}`;
    if (!words.every((w) => all.includes(w))) continue;

    const inTitle = words.filter((w) => title.includes(w)).length;
    const inAuthor = words.filter((w) => author.includes(w)).length;
    const field = inTitle >= inAuthor && inTitle > 0 ? "title" : inAuthor > 0 ? "author" : "notes";
    let score = inTitle * 3 + inAuthor * 2 + (title.startsWith(words[0]) ? 4 : 0);

    let snippet: string | undefined;
    if (field === "notes" || (inTitle === 0 && inAuthor === 0)) {
      const at = notes.indexOf(words[0]);
      // Start ~30 chars before the hit, snapped forward to a word boundary.
      let start = Math.max(0, at - 30);
      if (start > 0) start = Math.min(at, entry.notes.indexOf(" ", start) + 1 || at);
      snippet = `${start > 0 ? "…" : ""}${entry.notes.slice(start, at + 60).trim()}${at + 60 < entry.notes.length ? "…" : ""}`;
      score += 1;
    }
    scored.push({ entry, field, snippet, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.entry.book.title.localeCompare(b.entry.book.title));
}
