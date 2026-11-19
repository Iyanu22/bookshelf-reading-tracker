import type { Book, LibraryEntry, ReadingGoal } from "./types";

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Identity for "the same book". Editions differ in ISBN, so we prefer the
 * Open Library work id, then ISBN-13, then a normalized title + first author.
 * Title+author also catches editions that arrive without any ISBN.
 */
export function bookKey(b: Pick<Book, "title" | "authors" | "isbn13" | "openLibraryId">): string {
  if (b.openLibraryId) return `ol:${b.openLibraryId}`;
  if (b.isbn13) return `isbn:${b.isbn13}`;
  return `ta:${normalize(b.title)}|${normalize(b.authors[0] ?? "")}`;
}

/** Loose match used to flag "already in your library" across editions. */
export function workSignature(b: Pick<Book, "title" | "authors">): string {
  const title = normalize(b.title.split(":")[0]);
  return `${title}|${normalize(b.authors[0] ?? "")}`;
}

export function formatAuthors(authors: string[]): string {
  if (authors.length === 0) return "Unknown author";
  if (authors.length <= 2) return authors.join(" & ");
  return `${authors[0]} & ${authors.length - 1} others`;
}

/** Open Library cover sizes: S (~45px), M (~180px), L (~500px). */
export function coverAtSize(url: string | null, size: "S" | "M" | "L"): string | null {
  if (!url) return null;
  return url.replace(/-(S|M|L)\.jpg$/, `-${size}.jpg`);
}

export function isFinished(e: LibraryEntry) {
  return e.finishedAt !== null;
}

export function finishedInYear(entries: LibraryEntry[], year: number) {
  return entries.filter((e) => e.finishedAt && new Date(e.finishedAt).getFullYear() === year);
}

export type PaceStatus = "complete" | "ahead" | "on-track" | "behind";

export function goalPace(goal: ReadingGoal, completed: number, now = new Date()) {
  const start = new Date(goal.year, 0, 1).getTime();
  const end = new Date(goal.year + 1, 0, 1).getTime();
  const fraction = Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
  const expected = goal.target * fraction;
  const diff = completed - expected;
  let status: PaceStatus;
  if (completed >= goal.target) status = "complete";
  else if (diff >= 1) status = "ahead";
  else if (diff > -1) status = "on-track";
  else status = "behind";
  return {
    status,
    expected: Math.round(expected * 10) / 10,
    booksAhead: Math.round(diff),
    percent: goal.target > 0 ? Math.min(100, Math.round((completed / goal.target) * 100)) : 0,
    remaining: Math.max(0, goal.target - completed),
  };
}

export function clampPercent(n: number) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export const MS_PER_DAY = 86_400_000;
