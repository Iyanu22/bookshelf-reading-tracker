import type { YearStats } from "./stats";

/**
 * Year in Review story structure, kept free of JSX so the rules are easy to test:
 * which slides a year earns, in what order, and the copy that depends on the numbers.
 * Rendering lives in components/review/YearInReview.tsx.
 */

export type SlideId = "intro" | "books" | "pages" | "genre" | "month" | "habit" | "favourite" | "range" | "summary";

export const SLIDE_LABELS: Record<SlideId, string> = {
  intro: "Introduction",
  books: "Books read",
  pages: "Pages read",
  genre: "Top genre",
  month: "Busiest month",
  habit: "Reading habit",
  favourite: "Favourite book",
  range: "Longest and shortest",
  summary: "Summary",
};

type PlanInput = Pick<
  YearStats,
  "finished" | "pages" | "genres" | "busiestMonth" | "readingDays" | "topRated" | "longest" | "shortest"
>;

/**
 * The slides a year has enough data for. A slide that would be empty or trivial is
 * skipped rather than shown with zeros, so a light reading year still tells a good story.
 * Call only when at least one book was finished (the page shows an empty state otherwise).
 */
export function planSlides(s: PlanInput): SlideId[] {
  const ids: SlideId[] = ["intro", "books"];
  if (s.pages > 0) ids.push("pages");
  const top = s.genres[0];
  if (top && top.label !== "Uncategorized") ids.push("genre");
  // A "busiest month" out of one or two books isn't a pattern.
  if (s.busiestMonth && s.finished.length >= 3) ids.push("month");
  if (s.readingDays >= 3) ids.push("habit");
  if (s.topRated[0]) ids.push("favourite");
  if (s.longest && s.shortest && s.longest !== s.shortest) ids.push("range");
  ids.push("summary");
  return ids;
}

/** A human-scale reading of the book count, adjusted for how much of the year has passed. */
export function booksCopy(n: number, s: Pick<YearStats, "yearFraction">) {
  if (n <= 3) return "Every one of them a whole world. That counts.";
  const weeks = Math.round((52 * s.yearFraction) / n);
  if (n < 12) return `That's roughly one every ${weeks} weeks.`;
  const perMonth = n / (12 * s.yearFraction);
  return `That's about ${perMonth >= 1.95 ? Math.round(perMonth) : perMonth.toFixed(1)} a month.`;
}

/** Pages as a physical stack: a leaf is ~0.1 mm and holds two pages. */
export function pagesCopy(pages: number) {
  const cm = Math.round(pages * 0.005);
  if (cm < 5) return "Page by page, it adds up.";
  return `Stacked up, that's a tower of paper about ${cm} cm tall.`;
}
