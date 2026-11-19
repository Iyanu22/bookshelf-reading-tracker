import { MS_PER_DAY } from "./books";
import type { LibraryEntry, ProgressEvent } from "./types";

/**
 * Reading statistics — pure functions over the library and its progress
 * history, shared by the stats dashboard and Year in Review so the numbers
 * always agree.
 */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const PAGE_BINS = [
  { label: "Under 200", min: 0, max: 199 },
  { label: "200–299", min: 200, max: 299 },
  { label: "300–399", min: 300, max: 399 },
  { label: "400–499", min: 400, max: 499 },
  { label: "500+", min: 500, max: Infinity },
];

/** Broad, top-level genre for distribution charts: first tag, else "Uncategorized". */
export const primaryGenre = (e: LibraryEntry) => e.book.genres[0] ?? "Uncategorized";

const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export interface Ranked {
  label: string;
  value: number;
}

function rank(counts: Map<string, number>, limit: number, otherLabel = "Other"): Ranked[] {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (sorted.length <= limit) return sorted.map(([label, value]) => ({ label, value }));
  const head = sorted.slice(0, limit - 1).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(limit - 1).reduce((n, [, v]) => n + v, 0);
  return [...head, { label: otherLabel, value: rest }];
}

export interface FinishTime {
  entry: LibraryEntry;
  days: number;
}

export interface HeatDay {
  date: string; // YYYY-MM-DD
  pages: number;
  /** 0 = no reading, 1–4 = quartile-ish intensity. */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

export interface YearStats {
  year: number;
  isCurrentYear: boolean;
  /** Fraction of the year elapsed (1 for past years). */
  yearFraction: number;
  finished: LibraryEntry[];
  booksPerMonth: number[];
  previousBooksPerMonth: number[];
  previousYearCount: number;
  /** Books finished last year by this same date — a fair baseline for a year in progress. */
  previousToDateCount: number;
  pages: number;
  /** Finished books without a page count (excluded from page totals). */
  booksWithoutPages: number;
  averagePages: number | null;
  previousAveragePages: number | null;
  averageRating: number | null;
  ratingCounts: number[]; // index 0 → 1★ … index 4 → 5★
  genres: Ranked[];
  pageBins: Ranked[];
  authors: { unique: number; repeat: number; top: Ranked[] };
  finishTimes: { average: number | null; fastest: FinishTime | null; slowest: FinishTime | null };
  topRated: LibraryEntry[];
  longest: LibraryEntry | null;
  shortest: LibraryEntry | null;
  busiestMonth: { month: number; count: number } | null;
  heatmap: HeatDay[];
  readingDays: number;
  longestStreak: number;
}

function finishedIn(entries: LibraryEntry[], year: number) {
  return entries.filter((e) => e.finishedAt && new Date(e.finishedAt).getFullYear() === year);
}

function perMonth(list: LibraryEntry[]) {
  const months = Array<number>(12).fill(0);
  for (const e of list) months[new Date(e.finishedAt!).getMonth()]++;
  return months;
}

function averagePages(list: LibraryEntry[]) {
  const withPages = list.filter((e) => e.book.pageCount);
  if (!withPages.length) return null;
  return Math.round(withPages.reduce((n, e) => n + e.book.pageCount!, 0) / withPages.length);
}

/** Pages read per day, from progress history (percent deltas when a book has no page count are skipped). */
function pagesByDay(events: ProgressEvent[], entries: LibraryEntry[]) {
  const pagesOf = new Map(entries.map((e) => [e.id, e.book.pageCount]));
  const days = new Map<string, number>();
  const lastPercent = new Map<string, number>();
  for (const ev of [...events].sort((a, b) => a.at.localeCompare(b.at))) {
    const key = dayKey(new Date(ev.at).getTime());
    let pages = ev.pagesRead;
    if (pages === null) {
      // Percent-only books: count the session as reading, weighted by percent moved.
      const prev = lastPercent.get(ev.entryId) ?? 0;
      const total = pagesOf.get(ev.entryId);
      pages = total ? Math.round(((ev.percent - prev) / 100) * total) : Math.max(1, ev.percent - prev);
    }
    lastPercent.set(ev.entryId, ev.percent);
    if (pages > 0) days.set(key, (days.get(key) ?? 0) + pages);
  }
  return days;
}

export function computeYearStats(entries: LibraryEntry[], events: ProgressEvent[], year: number, now: number): YearStats {
  const nowYear = new Date(now).getFullYear();
  const isCurrentYear = year === nowYear;
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const yearFraction = isCurrentYear ? Math.min(1, (now - start) / (end - start)) : 1;

  const finished = finishedIn(entries, year).sort((a, b) => a.finishedAt!.localeCompare(b.finishedAt!));
  const previous = finishedIn(entries, year - 1);
  const booksPerMonth = perMonth(finished);

  const withPages = finished.filter((e) => e.book.pageCount);
  const pages = withPages.reduce((n, e) => n + e.book.pageCount!, 0);

  const rated = finished.filter((e) => e.rating);
  const ratingCounts = [0, 0, 0, 0, 0];
  for (const e of rated) ratingCounts[e.rating! - 1]++;

  const genreCounts = new Map<string, number>();
  for (const e of finished) genreCounts.set(primaryGenre(e), (genreCounts.get(primaryGenre(e)) ?? 0) + 1);

  const pageBins = PAGE_BINS.map((b) => ({
    label: b.label,
    value: withPages.filter((e) => e.book.pageCount! >= b.min && e.book.pageCount! <= b.max).length,
  }));

  const authorCounts = new Map<string, number>();
  for (const e of finished) for (const a of e.book.authors) authorCounts.set(a, (authorCounts.get(a) ?? 0) + 1);

  const times: FinishTime[] = finished
    .filter((e) => e.startedAt)
    .map((e) => ({
      entry: e,
      days: Math.max(1, Math.round((Date.parse(e.finishedAt!) - Date.parse(e.startedAt!)) / MS_PER_DAY)),
    }))
    .sort((a, b) => a.days - b.days);

  const busiest = booksPerMonth.reduce<{ month: number; count: number } | null>(
    (best, count, month) => (count > 0 && (!best || count > best.count) ? { month, count } : best),
    null,
  );

  // Heatmap: every day of the year; intensity scaled to this reader's own busy days.
  const byDay = pagesByDay(events, entries);
  const yearDays: HeatDay[] = [];
  const volumes: number[] = [];
  for (let t = start; t < end; t += MS_PER_DAY) {
    const d = new Date(t);
    // Guard against DST drift: normalise to local midnight.
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const key = dayKey(midnight);
    if (yearDays.at(-1)?.date === key) continue;
    const p = byDay.get(key) ?? 0;
    if (p > 0) volumes.push(p);
    yearDays.push({ date: key, pages: p, level: 0, future: midnight > now });
  }
  volumes.sort((a, b) => a - b);
  const q = (f: number) => volumes[Math.min(volumes.length - 1, Math.floor(volumes.length * f))] ?? 0;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  let streak = 0;
  let longestStreak = 0;
  for (const day of yearDays) {
    if (day.pages > 0) day.level = day.pages <= q1 ? 1 : day.pages <= q2 ? 2 : day.pages <= q3 ? 3 : 4;
    streak = day.pages > 0 ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
  }

  const byPages = [...withPages].sort((a, b) => a.book.pageCount! - b.book.pageCount!);

  return {
    year,
    isCurrentYear,
    yearFraction,
    finished,
    booksPerMonth,
    previousBooksPerMonth: perMonth(previous),
    previousYearCount: previous.length,
    previousToDateCount: isCurrentYear
      ? previous.filter((e) => Date.parse(e.finishedAt!) <= new Date(now).setFullYear(year - 1)).length
      : previous.length,
    pages,
    booksWithoutPages: finished.length - withPages.length,
    averagePages: averagePages(finished),
    previousAveragePages: averagePages(previous),
    averageRating: rated.length ? Math.round((rated.reduce((n, e) => n + e.rating!, 0) / rated.length) * 10) / 10 : null,
    ratingCounts,
    genres: rank(genreCounts, 6),
    pageBins,
    authors: {
      unique: authorCounts.size,
      repeat: [...authorCounts.values()].filter((n) => n > 1).length,
      top: rank(authorCounts, 50).filter((a) => a.value > 0).slice(0, 5),
    },
    finishTimes: {
      average: times.length ? Math.round(times.reduce((n, t) => n + t.days, 0) / times.length) : null,
      fastest: times[0] ?? null,
      slowest: times.at(-1) ?? null,
    },
    topRated: [...rated].sort((a, b) => b.rating! - a.rating! || b.finishedAt!.localeCompare(a.finishedAt!)).slice(0, 3),
    longest: byPages.at(-1) ?? null,
    shortest: byPages[0] ?? null,
    busiestMonth: busiest,
    heatmap: yearDays,
    readingDays: yearDays.filter((d) => d.pages > 0).length,
    longestStreak,
  };
}

/** Years that have any finished book, newest first (always includes the current year). */
export function yearsWithReading(entries: LibraryEntry[], currentYear: number) {
  const years = new Set<number>([currentYear]);
  for (const e of entries) if (e.finishedAt) years.add(new Date(e.finishedAt).getFullYear());
  return [...years].sort((a, b) => b - a);
}

/** Signed % change, or null when there's no baseline to compare against. */
export function percentChange(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}
