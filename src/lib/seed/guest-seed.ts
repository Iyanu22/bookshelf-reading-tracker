import sampleBooks from "../../../data/sample-books.json";
import { bookKey, MS_PER_DAY } from "../books";
import type {
  Book,
  LibraryEntry,
  LibrarySnapshot,
  ProgressEvent,
  ReadingGoal,
  Shelf,
} from "../types";

interface SampleBook {
  title: string;
  author: string;
  isbn13: string | null;
  isbn10: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  publishedDate: string | null;
  genres: string[];
  description: string | null;
  publisher: string | null;
}

export function sampleToBook(s: SampleBook): Book {
  const authors = s.author
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  const year = s.publishedDate ? parseInt(s.publishedDate, 10) : NaN;
  const partial = {
    title: s.title,
    authors,
    isbn13: s.isbn13,
    openLibraryId: null,
  };
  return {
    ...partial,
    key: bookKey(partial),
    coverUrl: s.coverUrl,
    pageCount: s.pageCount,
    publishedYear: Number.isFinite(year) ? year : null,
    isbn10: s.isbn10,
    publisher: s.publisher,
    description: s.description,
    genres: s.genres,
  };
}

export const GUEST_SHELVES: Shelf[] = [
  { id: "reading", name: "Currently Reading", kind: "reading", position: 0 },
  { id: "want", name: "Want to Read", kind: "want", position: 1 },
  { id: "read", name: "Read", kind: "read", position: 2 },
  { id: "favorites", name: "Favorites", kind: "custom", position: 3 },
  { id: "book-club", name: "Book Club", kind: "custom", position: 4 },
];

/** Indices into data/sample-books.json. */
const PLAN: Record<string, number[]> = {
  // Say Nothing (19) has no page count — demonstrates percentage-only progress.
  reading: [24, 11, 23, 30, 19],
  favorites: [9, 21, 15],
  "book-club": [7, 26],
  read: [0, 1, 2, 5, 6, 8, 10, 12, 14, 20, 22, 25, 28, 31, 33, 36, 37, 38, 40, 42, 43],
  want: [3, 4, 13, 16, 17, 18, 27, 29, 32, 34, 35, 39, 41, 44],
};

const READING_PERCENT: Record<number, number> = { 24: 65, 11: 30, 23: 82, 30: 15, 19: 40 };

const RATINGS: Record<number, number> = {
  0: 4, 1: 5, 2: 5, 5: 4, 6: 4, 8: 5, 10: 4, 12: 4, 14: 5, 20: 5, 22: 3, 25: 5,
  28: 4, 31: 4, 33: 5, 36: 3, 37: 5, 38: 3, 40: 4, 42: 4, 43: 4, 9: 5, 21: 5, 15: 5,
};

const NOTES: Record<number, string> = {
  1: "Atticus's closing argument still gives me chills. Reread the courtroom chapters twice.",
  8: "The Count turns confinement into a whole life. Wanted to underline every other sentence.",
  14: "Funny and devastating in the same paragraph. The chapter about his mother is unforgettable.",
  20: "Slow first hundred pages, then completely absorbing. The appendices are worth reading too.",
  25: "The second-person narration finally clicked around the midpoint. Starting book two soon.",
  33: "“The day will never come when you have everything under control.” Oddly comforting.",
  37: "Tracer bullets and broken windows — two ideas I bring up at work constantly.",
  40: "Deep modules > shallow modules. Short, opinionated and genuinely useful.",
  9: "Gorgeous prose. Circe's slow transformation from overlooked nymph to witch felt earned.",
  24: "Rocky is the best character I've met all year. Trying not to binge it in one night.",
  23: "Kvothe is insufferable and I can't stop reading.",
};

/** Small deterministic PRNG so the guest library looks the same on every visit. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (ms: number) => new Date(ms).toISOString();

/**
 * Builds the guest library relative to `now`, so the demo always shows a
 * healthy, current reading year no matter when someone visits.
 */
export function buildGuestLibrary(now = new Date()): LibrarySnapshot {
  const rand = mulberry32(2026);
  const books = (sampleBooks as SampleBook[]).map(sampleToBook);
  const today = now.getTime();
  const entries: LibraryEntry[] = [];
  const events: ProgressEvent[] = [];
  let eventSeq = 0;

  // Reading sessions between start and end, so stats have real history.
  function logSessions(entryId: string, startMs: number, endMs: number, pages: number | null, endPercent: number) {
    const days = Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY));
    const sessions = Math.max(2, Math.round(days / (1 + rand() * 2)));
    let lastPercent = 0;
    for (let s = 1; s <= sessions; s++) {
      const percent = Math.round((endPercent * s) / sessions);
      const at = startMs + ((endMs - startMs) * s) / sessions - rand() * MS_PER_DAY * 0.4;
      events.push({
        id: `seed-ev-${eventSeq++}`,
        entryId,
        at: iso(Math.min(at, endMs)),
        pagesRead: pages ? Math.round((pages * (percent - lastPercent)) / 100) : null,
        percent,
      });
      lastPercent = percent;
    }
  }

  // Finished books: 18 spread over the last ~320 days, the rest in the year before.
  const finishedIdx = [...PLAN.read, ...PLAN.favorites];
  const finishOffsets = finishedIdx
    .map((_, i) => (i < 18 ? 4 + (i * 316) / 17 + rand() * 8 : 335 + (i - 18) * 16 + rand() * 6))
    .sort((a, b) => a - b);

  finishedIdx.forEach((bookIdx, i) => {
    const book = books[bookIdx];
    const shelfId = PLAN.favorites.includes(bookIdx) ? "favorites" : "read";
    const finishedAt = today - finishOffsets[i] * MS_PER_DAY;
    const readingDays = Math.max(3, Math.round((book.pageCount ?? 300) / (18 + rand() * 30)));
    const startedAt = finishedAt - readingDays * MS_PER_DAY;
    const addedAt = startedAt - (7 + rand() * 120) * MS_PER_DAY;
    const id = `seed-${bookIdx}`;
    entries.push({
      id,
      book,
      shelfId,
      addedAt: iso(addedAt),
      startedAt: iso(startedAt),
      finishedAt: iso(finishedAt),
      rating: RATINGS[bookIdx] ?? null,
      notes: NOTES[bookIdx] ?? "",
      progress: { currentPage: book.pageCount, percent: 100, updatedAt: iso(finishedAt) },
    });
    logSessions(id, startedAt, finishedAt, book.pageCount, 100);
  });

  PLAN.reading.forEach((bookIdx, i) => {
    const book = books[bookIdx];
    const percent = READING_PERCENT[bookIdx];
    const startedAt = today - (6 + i * 5 + rand() * 6) * MS_PER_DAY;
    const updatedAt = today - (i * 0.7 + rand() * 0.5) * MS_PER_DAY;
    const id = `seed-${bookIdx}`;
    entries.push({
      id,
      book,
      shelfId: "reading",
      addedAt: iso(startedAt - (10 + rand() * 60) * MS_PER_DAY),
      startedAt: iso(startedAt),
      finishedAt: null,
      rating: null,
      notes: NOTES[bookIdx] ?? "",
      progress: {
        currentPage: book.pageCount ? Math.round((book.pageCount * percent) / 100) : null,
        percent,
        updatedAt: iso(updatedAt),
      },
    });
    logSessions(id, startedAt, updatedAt, book.pageCount, percent);
  });

  [...PLAN.want.map((i) => [i, "want"] as const), ...PLAN["book-club"].map((i) => [i, "book-club"] as const)].forEach(
    ([bookIdx, shelfId]) => {
      entries.push({
        id: `seed-${bookIdx}`,
        book: books[bookIdx],
        shelfId,
        addedAt: iso(today - (1 + rand() * 200) * MS_PER_DAY),
        startedAt: null,
        finishedAt: null,
        rating: null,
        notes: "",
        progress: null,
      });
    },
  );

  // A goal the guest is roughly on pace for, whatever the date.
  const year = now.getFullYear();
  const readThisYear = entries.filter((e) => e.finishedAt && new Date(e.finishedAt).getFullYear() === year).length;
  const yearFraction = (today - new Date(year, 0, 1).getTime()) / (365 * MS_PER_DAY);
  const target = Math.max(12, Math.ceil(readThisYear / Math.max(yearFraction, 0.08) / 2) * 2);
  const goals: ReadingGoal[] = [
    { year, target },
    { year: year - 1, target: 20 },
  ];

  events.sort((a, b) => a.at.localeCompare(b.at));
  return { shelves: GUEST_SHELVES, entries, goals, progressEvents: events };
}
