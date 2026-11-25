import { describe, expect, it } from "vitest";
import { day, entry } from "@/test/factories";
import { booksCopy, pagesCopy, planSlides } from "./review";
import { computeYearStats } from "./stats";

const NOW = day("2026-11-25T12:00:00Z");

describe("planSlides", () => {
  it("keeps a thin year to the slides it can fill", () => {
    const one = entry({ book: { pageCount: null, genres: [] }, finishedAt: "2026-04-01T00:00:00Z" });
    const s = computeYearStats([one], [], 2026, NOW);
    expect(planSlides(s)).toEqual(["intro", "books", "summary"]);
  });

  it("tells the full story when the data is there, in order", () => {
    const books = [
      entry({ book: { pageCount: 180 }, finishedAt: "2026-02-01T00:00:00Z", rating: 5 }),
      entry({ book: { pageCount: 420 }, finishedAt: "2026-02-20T00:00:00Z", rating: 3 }),
      entry({ book: { pageCount: 300 }, finishedAt: "2026-05-01T00:00:00Z" }),
    ];
    const s = { ...computeYearStats(books, [], 2026, NOW), readingDays: 12 };
    expect(planSlides(s)).toEqual(["intro", "books", "pages", "genre", "month", "habit", "favourite", "range", "summary"]);
  });

  it("skips the busiest-month slide until there are at least three books", () => {
    const two = [entry({ finishedAt: "2026-02-01T00:00:00Z" }), entry({ finishedAt: "2026-02-02T00:00:00Z" })];
    expect(planSlides(computeYearStats(two, [], 2026, NOW))).not.toContain("month");
  });

  it("skips the genre slide when nothing is tagged", () => {
    const untagged = [entry({ book: { genres: [] }, finishedAt: "2026-02-01T00:00:00Z" })];
    expect(planSlides(computeYearStats(untagged, [], 2026, NOW))).not.toContain("genre");
  });
});

describe("booksCopy", () => {
  it("celebrates small numbers rather than dividing them", () => {
    expect(booksCopy(2, { yearFraction: 1 })).toMatch(/whole world/);
  });
  it("speaks in weeks below a book a month, adjusted for the year so far", () => {
    expect(booksCopy(6, { yearFraction: 1 })).toBe("That's roughly one every 9 weeks.");
    expect(booksCopy(6, { yearFraction: 0.5 })).toBe("That's roughly one every 4 weeks.");
  });
  it("speaks in books per month above that", () => {
    expect(booksCopy(24, { yearFraction: 1 })).toBe("That's about 2 a month.");
    expect(booksCopy(18, { yearFraction: 1 })).toBe("That's about 1.5 a month.");
  });
});

describe("pagesCopy", () => {
  it("turns pages into a paper stack once it's tall enough to impress", () => {
    expect(pagesCopy(500)).toBe("Page by page, it adds up.");
    expect(pagesCopy(6443)).toBe("Stacked up, that's a tower of paper about 32 cm tall.");
  });
});
