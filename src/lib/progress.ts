import { MS_PER_DAY } from "./books";
import type { LibraryEntry, ProgressEvent } from "./types";

/** Progress is measured in pages when we know the page count, otherwise in percent. */
export type ProgressUnit = "pages" | "percent";

export function progressUnit(entry: LibraryEntry): ProgressUnit {
  return entry.book.pageCount ? "pages" : "percent";
}

/** Where the reader is, in the entry's own unit. */
export function currentPosition(entry: LibraryEntry): number {
  if (progressUnit(entry) === "pages") return entry.progress?.currentPage ?? 0;
  return entry.progress?.percent ?? 0;
}

export function totalUnits(entry: LibraryEntry): number {
  return entry.book.pageCount ?? 100;
}

/** One-tap increments: pages for books with a page count, percentage points otherwise. */
export function quickSteps(entry: LibraryEntry): number[] {
  return progressUnit(entry) === "pages" ? [10, 25, 50] : [5, 10, 25];
}

/** Moments worth marking. Ordered; only the highest one crossed in an update is shown. */
export const MILESTONES = [
  { at: 50, message: "Halfway there! 🎉" },
  { at: 90, message: "The final stretch — nearly done." },
] as const;

export function crossedMilestone(before: number, after: number) {
  let hit: (typeof MILESTONES)[number] | null = null;
  for (const m of MILESTONES) if (before < m.at && after >= m.at && after < 100) hit = m;
  return hit;
}

const PACE_WINDOW_DAYS = 21;

/**
 * Units read per day. Prefers recent history (last 3 weeks of updates) so the
 * estimate reflects how the reader is going *now*, falling back to the average
 * since they started. Returns null when there isn't enough signal yet.
 */
export function readingPace(entry: LibraryEntry, events: ProgressEvent[], now: number): number | null {
  const pos = currentPosition(entry);
  if (pos <= 0) return null;
  const total = totalUnits(entry);
  const toUnits = (percent: number) => (percent / 100) * total;

  const mine = events.filter((e) => e.entryId === entry.id).sort((a, b) => a.at.localeCompare(b.at));
  const windowStart = now - PACE_WINDOW_DAYS * MS_PER_DAY;
  const before = mine.filter((e) => new Date(e.at).getTime() < windowStart).at(-1);
  const recent = mine.filter((e) => new Date(e.at).getTime() >= windowStart);

  if (recent.length >= 2 || (recent.length >= 1 && before)) {
    const startPercent = before?.percent ?? recent[0].percent;
    const startAt = before ? windowStart : new Date(recent[0].at).getTime();
    const days = (now - startAt) / MS_PER_DAY;
    const read = toUnits((entry.progress?.percent ?? 0) - startPercent);
    if (days >= 1 && read > 0) return read / days;
  }

  if (!entry.startedAt) return null;
  const days = (now - new Date(entry.startedAt).getTime()) / MS_PER_DAY;
  return days >= 1 ? pos / days : null;
}

export interface FinishEstimate {
  remaining: number;
  unit: ProgressUnit;
  /** Null when we can't estimate (no pace yet). */
  daysLeft: number | null;
  finishDate: Date | null;
}

export function finishEstimate(entry: LibraryEntry, events: ProgressEvent[], now: number): FinishEstimate {
  const unit = progressUnit(entry);
  const remaining = Math.max(0, totalUnits(entry) - currentPosition(entry));
  const pace = readingPace(entry, events, now);
  if (!pace || remaining === 0) return { remaining, unit, daysLeft: null, finishDate: null };
  const daysLeft = Math.max(1, Math.ceil(remaining / pace));
  // Beyond a year the estimate is noise, not information.
  if (daysLeft > 365) return { remaining, unit, daysLeft: null, finishDate: null };
  return { remaining, unit, daysLeft, finishDate: new Date(now + daysLeft * MS_PER_DAY) };
}
