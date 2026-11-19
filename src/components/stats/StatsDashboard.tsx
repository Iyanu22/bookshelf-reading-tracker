"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatAuthors } from "@/lib/books";
import { computeYearStats, MONTHS_LONG, percentChange, yearsWithReading, type FinishTime } from "@/lib/stats";
import { useLibrary } from "@/lib/store/library-store";
import { useNow } from "@/lib/use-now";
import { BookCover } from "../book/BookCover";
import { ChartCard, Legend, StatTile } from "./chart-kit";
import { ColumnChart, MonthlyChart, RankedBars, ReadingHeatmap } from "./charts";

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

function FinishRow({ label, time }: { label: string; time: FinishTime }) {
  return (
    <li className="flex items-center gap-3">
      <div className="w-10 shrink-0">
        <BookCover book={time.entry.book} size="xs" decorative />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-tertiary">{label}</p>
        <Link href={`/books/${time.entry.id}`} className="block truncate text-sm font-medium hover:text-accent">
          {time.entry.book.title}
        </Link>
      </div>
      <p className="text-sm font-semibold whitespace-nowrap text-text-primary">{plural(time.days, "day")}</p>
    </li>
  );
}

export function StatsDashboard() {
  const status = useLibrary((s) => s.status);
  const entries = useLibrary((s) => s.entries);
  const events = useLibrary((s) => s.progressEvents);
  const currentYear = useLibrary((s) => s.currentYear);
  const now = useNow();
  const [picked, setPicked] = useState<number | null>(null);

  const years = useMemo(() => (currentYear ? yearsWithReading(entries, currentYear) : []), [entries, currentYear]);
  const year = picked ?? currentYear;
  const stats = useMemo(
    () => (year && now ? computeYearStats(entries, events, year, now) : null),
    [entries, events, year, now],
  );

  if (status !== "ready" || !stats || !year) {
    return (
      <div className="mx-auto max-w-library" aria-busy="true">
        <div className="h-9 w-56 animate-pulse rounded bg-bg-tertiary" />
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-tertiary" />
          ))}
        </div>
      </div>
    );
  }

  const count = stats.finished.length;
  const sameDate = stats.isCurrentYear;
  const booksDelta = percentChange(count, stats.previousToDateCount);
  const hasPrevious = stats.previousYearCount > 0;

  return (
    <div className="mx-auto max-w-library">
      <title>{`Reading stats ${year} — Bookshelf`}</title>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Reading stats</h1>
          <p className="mt-1 text-text-secondary">
            {stats.isCurrentYear ? `Your ${year} so far.` : `Your reading in ${year}.`}
          </p>
        </div>
        {/* One filter, above everything it scopes. */}
        <div>
          <label htmlFor="stats-year" className="block text-xs font-medium text-text-tertiary">
            Year
          </label>
          <select
            id="stats-year"
            value={year}
            onChange={(e) => setPicked(Number(e.target.value))}
            className="mt-1 h-11 rounded-md border border-border bg-surface px-3 font-medium focus:border-accent focus:outline-none lg:h-10"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {count === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <p className="font-heading text-xl">No finished books in {year} yet</p>
          <p className="mx-auto mt-2 max-w-md text-text-secondary">
            Your stats start with the first book you finish. Mark a book as read — or log progress on one you&apos;re
            reading — and this page fills in.
          </p>
          <Link
            href="/library"
            className="mt-6 inline-flex h-11 items-center rounded-md bg-accent px-5 font-semibold text-bg-primary hover:bg-accent-hover"
          >
            Go to your library
          </Link>
        </div>
      ) : (
        <>
          <Link
            href={`/year-in-review?year=${year}`}
            className="group mt-6 flex items-center gap-4 rounded-xl bg-[#2c2420] px-5 py-4 text-[#faf8f5] shadow-md transition-transform hover:-translate-y-0.5 sm:px-6"
          >
            <Sparkles aria-hidden size={22} className="shrink-0 text-[#e0b84a]" />
            <span className="min-w-0 flex-1">
              <span className="block font-heading text-lg font-semibold">
                Your {year} in books{stats.isCurrentYear ? " — so far" : ""}
              </span>
              <span className="block text-sm text-[#faf8f5]/75">A tap-through story of your reading year, made to share.</span>
            </span>
            <ArrowRight aria-hidden size={20} className="shrink-0 transition-transform group-hover:translate-x-1" />
          </Link>

          <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatTile
              label="Books read"
              value={count}
              delta={hasPrevious ? { percent: booksDelta, versus: sameDate ? `than this time in ${year - 1}` : `than ${year - 1}` } : null}
            />
            <StatTile
              label="Pages read"
              value={stats.pages.toLocaleString()}
              note={stats.booksWithoutPages ? `${plural(stats.booksWithoutPages, "book")} without a page count not included` : undefined}
            />
            <StatTile
              label="Average length"
              value={stats.averagePages ? `${stats.averagePages} pp` : "—"}
              note={
                stats.averagePages && stats.previousAveragePages
                  ? `${Math.abs(stats.averagePages - stats.previousAveragePages)} pages ${stats.averagePages >= stats.previousAveragePages ? "longer" : "shorter"} than ${year - 1}`
                  : undefined
              }
            />
            <StatTile label="Average rating" value={stats.averageRating ? `${stats.averageRating} ★` : "—"} />
            <StatTile
              label="Authors"
              value={stats.authors.unique}
              note={stats.authors.repeat ? `${stats.authors.repeat} read more than once` : "Every one new"}
            />
          </dl>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <ChartCard
              className="lg:col-span-2"
              title="Books finished per month"
              subtitle={stats.busiestMonth ? `Busiest month: ${MONTHS_LONG[stats.busiestMonth.month]} (${plural(stats.busiestMonth.count, "book")})` : undefined}
              legend={
                hasPrevious ? (
                  <Legend
                    items={[
                      { label: String(year), className: "bg-viz-series" },
                      { label: String(year - 1), className: "bg-viz-context" },
                    ]}
                  />
                ) : undefined
              }
              table={{
                caption: `Books finished per month, ${year}${hasPrevious ? ` and ${year - 1}` : ""}`,
                columns: hasPrevious ? ["Month", String(year), String(year - 1)] : ["Month", String(year)],
                rows: MONTHS_LONG.map((m, i) =>
                  hasPrevious ? [m, stats.booksPerMonth[i], stats.previousBooksPerMonth[i]] : [m, stats.booksPerMonth[i]],
                ),
              }}
            >
              <MonthlyChart values={stats.booksPerMonth} context={hasPrevious ? stats.previousBooksPerMonth : undefined} year={year} />
            </ChartCard>

            <ChartCard
              title="Genres"
              subtitle="By each book's main genre"
              table={{ caption: `Books by genre, ${year}`, columns: ["Genre", "Books"], rows: stats.genres.map((g) => [g.label, g.value]) }}
            >
              <RankedBars data={stats.genres} unit={["book", "books"]} />
            </ChartCard>
          </div>

          <ChartCard
            className="mt-6"
            title="Reading activity"
            subtitle={`${plural(stats.readingDays, "day")} with reading logged · longest streak ${plural(stats.longestStreak, "day")}`}
            table={{
              caption: `Pages read per month, ${year}`,
              columns: ["Month", "Pages read", "Days with reading"],
              rows: MONTHS_LONG.map((m, i) => {
                const inMonth = stats.heatmap.filter((d) => Number(d.date.slice(5, 7)) === i + 1);
                return [m, inMonth.reduce((n, d) => n + d.pages, 0), inMonth.filter((d) => d.pages > 0).length];
              }),
            }}
          >
            <ReadingHeatmap days={stats.heatmap} year={year} />
          </ChartCard>

          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ChartCard
              title="Book lengths"
              subtitle="Finished books by page count"
              table={{ caption: `Books by page count, ${year}`, columns: ["Pages", "Books"], rows: stats.pageBins.map((b) => [b.label, b.value]) }}
            >
              <ColumnChart
                labels={stats.pageBins.map((b) => b.label)}
                values={stats.pageBins.map((b) => b.value)}
                seriesName="Books"
                unit={["book", "books"]}
                ariaLabel={`Finished books by page count in ${year}`}
              />
            </ChartCard>

            <ChartCard
              title="Your ratings"
              subtitle={stats.averageRating ? `Average ${stats.averageRating} out of 5` : "No ratings yet"}
              table={{
                caption: `Ratings given, ${year}`,
                columns: ["Rating", "Books"],
                rows: [5, 4, 3, 2, 1].map((r) => [`${r} stars`, stats.ratingCounts[r - 1]]),
              }}
            >
              <RankedBars
                keepOrder
                data={[5, 4, 3, 2, 1].map((r) => ({ label: `${"★".repeat(r)}`, value: stats.ratingCounts[r - 1] }))}
                unit={["book", "books"]}
              />
            </ChartCard>

            <ChartCard
              title="Time to finish"
              subtitle={stats.finishTimes.average ? `${plural(stats.finishTimes.average, "day")} on average` : "Not enough dates yet"}
              className="md:col-span-2 lg:col-span-1"
            >
              <ul className="space-y-4">
                {stats.finishTimes.fastest && <FinishRow label="Fastest read" time={stats.finishTimes.fastest} />}
                {stats.finishTimes.slowest && stats.finishTimes.slowest !== stats.finishTimes.fastest && (
                  <FinishRow label="Took its time" time={stats.finishTimes.slowest} />
                )}
              </ul>
              {stats.authors.top[0] && stats.authors.top[0].value > 1 && (
                <p className="mt-5 border-t border-border-subtle pt-4 text-sm text-text-secondary">
                  Most-read author: <span className="font-medium text-text-primary">{stats.authors.top[0].label}</span> (
                  {plural(stats.authors.top[0].value, "book")})
                </p>
              )}
              {stats.topRated[0] && (
                <p className="mt-3 text-sm text-text-secondary">
                  Top rated:{" "}
                  <Link href={`/books/${stats.topRated[0].id}`} className="font-medium text-text-primary hover:text-accent">
                    {stats.topRated[0].book.title}
                  </Link>{" "}
                  by {formatAuthors(stats.topRated[0].book.authors)}
                </p>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
