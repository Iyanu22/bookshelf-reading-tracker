import { describe, expect, it } from "vitest";
import { day, entry, progressEvent } from "@/test/factories";
import { computeYearStats, percentChange, yearsWithReading } from "./stats";

const NOW = day("2026-07-02T12:00:00Z"); // roughly halfway through 2026

const jan = entry({
  book: { pageCount: 200, genres: ["Fantasy"], authors: ["A"] },
  startedAt: "2026-01-01T00:00:00Z",
  finishedAt: "2026-01-11T00:00:00Z",
  rating: 4,
});
const mar1 = entry({
  book: { pageCount: 600, genres: ["Fantasy"], authors: ["A"] },
  startedAt: "2026-02-20T00:00:00Z",
  finishedAt: "2026-03-02T00:00:00Z",
  rating: 5,
});
const mar2 = entry({
  book: { pageCount: null, genres: ["Memoir"], authors: ["B"] },
  finishedAt: "2026-03-20T00:00:00Z",
});
const lastYearEarly = entry({ finishedAt: "2025-05-01T00:00:00Z" });
const lastYearLate = entry({ finishedAt: "2025-10-01T00:00:00Z" });
const unfinished = entry({ startedAt: "2026-06-01T00:00:00Z" });

const all = [jan, mar1, mar2, lastYearEarly, lastYearLate, unfinished];

describe("computeYearStats", () => {
  const s = computeYearStats(all, [], 2026, NOW);

  it("counts only books finished in the year, by month", () => {
    expect(s.finished.map((e) => e.id)).toEqual([jan.id, mar1.id, mar2.id]);
    expect(s.booksPerMonth.slice(0, 4)).toEqual([1, 0, 2, 0]);
    expect(s.busiestMonth).toEqual({ month: 2, count: 2 });
  });

  it("sums pages only for books with a page count", () => {
    expect(s.pages).toBe(800);
    expect(s.booksWithoutPages).toBe(1);
    expect(s.averagePages).toBe(400);
    expect(s.longest?.id).toBe(mar1.id);
    expect(s.shortest?.id).toBe(jan.id);
  });

  it("ranks genres, authors and ratings", () => {
    expect(s.genres[0]).toMatchObject({ label: "Fantasy", value: 2 });
    expect(s.authors).toMatchObject({ unique: 2, repeat: 1 });
    expect(s.averageRating).toBe(4.5);
    expect(s.ratingCounts).toEqual([0, 0, 0, 1, 1]);
    expect(s.topRated.map((e) => e.id)).toEqual([mar1.id, jan.id]);
  });

  it("averages time to finish over books with a start date", () => {
    expect(s.finishTimes.average).toBe(10); // 10 days each
  });

  it("compares the year so far with the same point last year", () => {
    expect(s.isCurrentYear).toBe(true);
    expect(s.yearFraction).toBeGreaterThan(0.49);
    expect(s.yearFraction).toBeLessThan(0.51);
    expect(s.previousYearCount).toBe(2);
    expect(s.previousToDateCount).toBe(1); // only the May book was done by 2 July 2025
  });

  it("treats a past year as complete", () => {
    const past = computeYearStats(all, [], 2025, NOW);
    expect(past.isCurrentYear).toBe(false);
    expect(past.yearFraction).toBe(1);
    expect(past.previousToDateCount).toBe(past.previousYearCount);
  });

  it("builds the reading heatmap and longest streak from progress history", () => {
    const events = [
      progressEvent(unfinished.id, "2026-06-01T09:00:00Z", 5, 15),
      progressEvent(unfinished.id, "2026-06-02T09:00:00Z", 10, 15),
      progressEvent(unfinished.id, "2026-06-03T09:00:00Z", 20, 30),
      progressEvent(unfinished.id, "2026-06-05T09:00:00Z", 25, 15),
    ];
    const withHistory = computeYearStats(all, events, 2026, NOW);
    expect(withHistory.heatmap).toHaveLength(365);
    expect(withHistory.readingDays).toBe(4);
    expect(withHistory.longestStreak).toBe(3);
    const june3 = withHistory.heatmap.find((d) => d.date.endsWith("06-03"));
    expect(june3?.level).toBe(4); // the busiest day gets the darkest step
    expect(withHistory.heatmap.find((d) => d.date.endsWith("12-25"))?.future).toBe(true);
  });
});

describe("percentChange", () => {
  it("returns a rounded signed change, or null without a baseline", () => {
    expect(percentChange(15, 10)).toBe(50);
    expect(percentChange(5, 10)).toBe(-50);
    expect(percentChange(3, 0)).toBeNull();
  });
});

describe("yearsWithReading", () => {
  it("lists years with finished books, newest first, always including this year", () => {
    expect(yearsWithReading(all, 2027)).toEqual([2027, 2026, 2025]);
  });
});
