import { describe, expect, it } from "vitest";
import { day, entry, progressEvent } from "@/test/factories";
import { MS_PER_DAY } from "./books";
import { crossedMilestone, finishEstimate, quickSteps, readingPace } from "./progress";

const NOW = day("2026-11-25T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * MS_PER_DAY).toISOString();

describe("quickSteps", () => {
  it("steps in pages when the page count is known, percent otherwise", () => {
    expect(quickSteps(entry({ book: { pageCount: 320 } }))).toEqual([10, 25, 50]);
    expect(quickSteps(entry({ book: { pageCount: null } }))).toEqual([5, 10, 25]);
  });
});

describe("crossedMilestone", () => {
  it("fires when an update crosses 50% or 90%", () => {
    expect(crossedMilestone(40, 55)?.at).toBe(50);
    expect(crossedMilestone(85, 92)?.at).toBe(90);
  });
  it("reports only the highest milestone crossed in one jump", () => {
    expect(crossedMilestone(10, 95)?.at).toBe(90);
  });
  it("stays quiet when nothing is crossed, or when the book is finished", () => {
    expect(crossedMilestone(55, 60)).toBeNull();
    expect(crossedMilestone(95, 100)).toBeNull();
    expect(crossedMilestone(40, 100)).toBeNull();
  });
});

describe("readingPace", () => {
  it("falls back to the average since starting when there is no recent history", () => {
    const e = entry({ startedAt: daysAgo(30), progress: { currentPage: 150, percent: 50, updatedAt: daysAgo(1) } });
    expect(readingPace(e, [], NOW)).toBeCloseTo(5); // 150 pages / 30 days
  });

  it("prefers the last three weeks of updates", () => {
    const e = entry({ startedAt: daysAgo(60), progress: { currentPage: 150, percent: 50, updatedAt: daysAgo(1) } });
    const events = [progressEvent(e.id, daysAgo(40), 10), progressEvent(e.id, daysAgo(5), 40)];
    // From 10% at the window start (21 days ago) to 50% now: 120 of 300 pages in 21 days.
    expect(readingPace(e, events, NOW)).toBeCloseTo(120 / 21);
  });

  it("has no opinion before any progress or within the first day", () => {
    expect(readingPace(entry({ startedAt: daysAgo(10) }), [], NOW)).toBeNull();
    const fresh = entry({ startedAt: new Date(NOW - 3_600_000).toISOString(), progress: { currentPage: 20, percent: 7, updatedAt: daysAgo(0) } });
    expect(readingPace(fresh, [], NOW)).toBeNull();
  });
});

describe("finishEstimate", () => {
  it("counts days left from today at the current pace", () => {
    const e = entry({ startedAt: daysAgo(30), progress: { currentPage: 150, percent: 50, updatedAt: daysAgo(1) } });
    const est = finishEstimate(e, [], NOW);
    expect(est).toMatchObject({ remaining: 150, unit: "pages", daysLeft: 30 });
    expect(est.finishDate?.getTime()).toBe(NOW + 30 * MS_PER_DAY);
  });

  it("works in percent for books without a page count", () => {
    const e = entry({ book: { pageCount: null }, startedAt: daysAgo(10), progress: { currentPage: null, percent: 20, updatedAt: daysAgo(1) } });
    expect(finishEstimate(e, [], NOW)).toMatchObject({ remaining: 80, unit: "percent", daysLeft: 40 });
  });

  it("gives no date when an estimate would be noise (over a year away)", () => {
    const e = entry({ startedAt: daysAgo(300), progress: { currentPage: 10, percent: 3, updatedAt: daysAgo(1) } });
    expect(finishEstimate(e, [], NOW)).toMatchObject({ daysLeft: null, finishDate: null });
  });
});
