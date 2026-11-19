"use client";

import { ChevronLeft, ChevronRight, RotateCcw, Star, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatAuthors } from "@/lib/books";
import { computeYearStats, MONTHS, MONTHS_LONG, type YearStats } from "@/lib/stats";
import { useLibrary } from "@/lib/store/library-store";
import type { LibraryEntry, ReadingGoal } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { BookCover } from "../book/BookCover";

/* Each slide gets its own warm, deep ground so the story feels like a special
   moment, distinct from the app — while staying inside the brand's palette. */
const GROUNDS = ["#211a16", "#5a2c12", "#1f3a2e", "#3b2433", "#1f2a3d", "#4a1f1f", "#2c2420"];
const CREAM = "#faf8f5";
const GOLD = "#e0b84a";

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold tracking-[0.18em] uppercase opacity-75">{children}</p>;
}

/** Hero figures stay in the UI sans; headlines carry the literary serif. */
function Hero({ children }: { children: ReactNode }) {
  return <p className="mt-4 font-sans text-7xl leading-none font-bold tracking-tight sm:text-8xl">{children}</p>;
}

function Line({ children }: { children: ReactNode }) {
  return <p className="mt-6 font-heading text-2xl leading-snug text-balance">{children}</p>;
}

interface Slide {
  id: string;
  label: string;
  render: () => ReactNode;
}

function booksCopy(n: number, s: YearStats) {
  if (n <= 3) return "Every one of them a whole world. That counts.";
  const weeks = Math.round((52 * s.yearFraction) / n);
  if (n < 12) return `That's roughly one every ${weeks} weeks.`;
  const perMonth = n / (12 * s.yearFraction);
  return `That's about ${perMonth >= 1.95 ? Math.round(perMonth) : perMonth.toFixed(1)} a month.`;
}

function pagesCopy(pages: number) {
  // A leaf is ~0.1 mm and holds two pages.
  const cm = Math.round(pages * 0.005);
  if (cm < 5) return "Page by page, it adds up.";
  return `Stacked up, that's a tower of paper about ${cm} cm tall.`;
}

function buildSlides(s: YearStats, goal: ReadingGoal | undefined): Slide[] {
  const n = s.finished.length;
  const slides: Slide[] = [];

  slides.push({
    id: "intro",
    label: "Introduction",
    render: () => (
      <>
        <Kicker>Bookshelf · Year in review</Kicker>
        <h2 className="mt-6 font-heading text-5xl leading-tight font-semibold text-balance sm:text-6xl">
          Your {s.year} in books
        </h2>
        <Line>{s.isCurrentYear ? "The story so far — let's look back at what you've read." : "Let's look back at what you read."}</Line>
        <div aria-hidden className="mt-10 flex -space-x-6">
          {s.finished.slice(-5).map((e, i) => (
            <div key={e.id} className="w-20 shrink-0" style={{ transform: `rotate(${(i - 2) * 5}deg)` }}>
              <BookCover book={e.book} size="sm" decorative priority />
            </div>
          ))}
        </div>
      </>
    ),
  });

  slides.push({
    id: "books",
    label: "Books read",
    render: () => (
      <>
        <Kicker>{s.isCurrentYear ? "So far this year, you finished" : `In ${s.year}, you finished`}</Kicker>
        <Hero>{n}</Hero>
        <p className="mt-2 text-2xl font-medium">{n === 1 ? "book" : "books"}</p>
        <Line>{booksCopy(n, s)}</Line>
        {goal && (
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
            {n >= goal.target ? (
              <>🎉 You hit your goal of {goal.target}!</>
            ) : (
              <>
                {n} of your {goal.target}-book goal · {goal.target - n} to go
              </>
            )}
          </p>
        )}
      </>
    ),
  });

  if (s.pages > 0) {
    slides.push({
      id: "pages",
      label: "Pages read",
      render: () => (
        <>
          <Kicker>You turned</Kicker>
          <Hero>{s.pages.toLocaleString()}</Hero>
          <p className="mt-2 text-2xl font-medium">pages</p>
          <Line>{pagesCopy(s.pages)}</Line>
          {s.averagePages && <p className="mt-4 opacity-75">Your average book ran {s.averagePages} pages.</p>}
        </>
      ),
    });
  }

  const top = s.genres[0];
  if (top && top.label !== "Uncategorized") {
    slides.push({
      id: "genre",
      label: "Top genre",
      render: () => (
        <>
          <Kicker>Your most-read genre</Kicker>
          <h2 className="mt-6 font-heading text-5xl leading-tight font-semibold text-balance sm:text-6xl">{top.label}</h2>
          <Line>
            {plural(top.value, "book")} — {Math.round((top.value / n) * 100)}% of everything you finished.
          </Line>
          {s.genres.length > 1 && (
            <ol className="mt-8 space-y-2 text-lg">
              {s.genres.slice(1, 4).map((g, i) => (
                <li key={g.label} className="flex gap-3 opacity-85">
                  <span className="w-5 opacity-60">{i + 2}</span>
                  <span className="flex-1">{g.label}</span>
                  <span className="opacity-70">{g.value}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      ),
    });
  }

  if (s.busiestMonth && n >= 3) {
    const peak = s.busiestMonth;
    const max = Math.max(...s.booksPerMonth);
    slides.push({
      id: "month",
      label: "Busiest month",
      render: () => (
        <>
          <Kicker>Your biggest reading month</Kicker>
          <h2 className="mt-6 font-heading text-5xl font-semibold sm:text-6xl">{MONTHS_LONG[peak.month]}</h2>
          <Line>{plural(peak.count, "book")} finished in a single month.</Line>
          {/* Emphasis: the peak in gold, every other month quiet. */}
          <div
            role="img"
            aria-label={`Books per month: ${s.booksPerMonth.map((v, i) => `${MONTHS[i]} ${v}`).join(", ")}`}
            className="mt-10 flex h-32 items-end gap-[3px]"
          >
            {s.booksPerMonth.map((v, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
                <div
                  className="w-full max-w-5 rounded-t-[4px]"
                  style={{ height: `${(v / max) * 100}%`, minHeight: v ? 4 : 0, background: i === peak.month ? GOLD : "rgba(250,248,245,0.28)" }}
                />
              </div>
            ))}
          </div>
          <div aria-hidden className="mt-2 flex text-[0.65rem] opacity-60">
            {MONTHS.map((m) => (
              <span key={m} className="flex-1 text-center">
                {m[0]}
              </span>
            ))}
          </div>
        </>
      ),
    });
  }

  if (s.readingDays >= 3) {
    slides.push({
      id: "habit",
      label: "Reading habit",
      render: () => (
        <>
          <Kicker>You opened a book on</Kicker>
          <Hero>{s.readingDays}</Hero>
          <p className="mt-2 text-2xl font-medium">different days</p>
          {s.longestStreak >= 2 && (
            <Line>
              Your longest streak: <span style={{ color: GOLD }}>{plural(s.longestStreak, "day")}</span> in a row.
            </Line>
          )}
          {s.finishTimes.average && (
            <p className="mt-4 opacity-75">On average, a book took you {plural(s.finishTimes.average, "day")} from start to finish.</p>
          )}
        </>
      ),
    });
  }

  const fav = s.topRated[0];
  if (fav) {
    slides.push({
      id: "favourite",
      label: "Favourite book",
      render: () => <FavouriteSlide entry={fav} />,
    });
  }

  if (s.longest && s.shortest && s.longest !== s.shortest) {
    const pair = [
      { label: "Longest", e: s.longest },
      { label: "Shortest", e: s.shortest },
    ];
    slides.push({
      id: "range",
      label: "Longest and shortest",
      render: () => (
        <>
          <Kicker>From epic to quick read</Kicker>
          <div className="mt-8 grid grid-cols-2 gap-6">
            {pair.map(({ label, e }) => (
              <div key={label} className="max-w-[8.5rem] [@media(min-height:820px)]:max-w-[11rem]">
                <BookCover book={e.book} size="md" decorative />
                <p className="mt-3 text-sm opacity-70">{label}</p>
                <p className="font-heading text-lg leading-snug">{e.book.title}</p>
                <p className="mt-1 text-2xl font-bold">{e.book.pageCount} pp</p>
              </div>
            ))}
          </div>
        </>
      ),
    });
  }

  slides.push({ id: "summary", label: "Summary", render: () => <SummaryCard s={s} goal={goal} /> });
  return slides;
}

function FavouriteSlide({ entry }: { entry: LibraryEntry }) {
  return (
    <>
      <Kicker>Your favourite read</Kicker>
      <div className="mx-auto mt-6 w-32 [@media(min-height:820px)]:w-48">
        <BookCover book={entry.book} size="lg" decorative priority />
      </div>
      <h2 className="mt-6 font-heading text-3xl leading-tight font-semibold text-balance">{entry.book.title}</h2>
      <p className="mt-1 opacity-80">{formatAuthors(entry.book.authors)}</p>
      <p className="mt-3 inline-flex gap-1" role="img" aria-label={`Rated ${entry.rating} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} aria-hidden size={22} fill={i < (entry.rating ?? 0) ? GOLD : "transparent"} stroke={GOLD} />
        ))}
      </p>
      {entry.notes && <blockquote className="mt-5 font-heading text-lg italic opacity-85">“{entry.notes.slice(0, 140)}{entry.notes.length > 140 ? "…" : ""}”</blockquote>}
    </>
  );
}

/** The shareable card: one calm composition that survives a screenshot. */
function SummaryCard({ s, goal }: { s: YearStats; goal: ReadingGoal | undefined }) {
  const covers = [...s.finished].reverse().slice(0, 10);
  const n = s.finished.length;
  const facts = [
    { k: "Books", v: String(n) },
    { k: "Pages", v: s.pages.toLocaleString() },
    s.genres[0] && s.genres[0].label !== "Uncategorized" ? { k: "Top genre", v: s.genres[0].label } : null,
    s.averageRating ? { k: "Avg rating", v: `${s.averageRating} ★` } : null,
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl p-5 text-left text-[#2c2420] shadow-2xl [@media(min-height:820px)]:p-6" style={{ background: CREAM }}>
      <p className="text-xs font-semibold tracking-[0.18em] text-[#9e5a27] uppercase">Bookshelf</p>
      <h2 className="mt-1 font-heading text-2xl font-semibold [@media(min-height:820px)]:text-3xl">
        My {s.year} in books{s.isCurrentYear ? " (so far)" : ""}
      </h2>
      <div className="mt-4 grid grid-cols-5 gap-1.5" aria-hidden>
        {covers.map((e) => (
          <BookCover key={e.id} book={e.book} size="xs" decorative />
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
        {facts.map((f) => (
          <div key={f.k}>
            <dt className="text-xs text-[#6e645b]">{f.k}</dt>
            <dd className="text-xl font-bold">{f.v}</dd>
          </div>
        ))}
      </dl>
      {s.topRated[0] && (
        <p className="mt-3 border-t border-[#ddd8d0] pt-3 text-sm text-[#5c534a]">
          Favourite: <span className="font-heading font-semibold text-[#2c2420]">{s.topRated[0].book.title}</span>
        </p>
      )}
      {goal && (
        <p className="mt-1 text-sm text-[#5c534a]">
          Goal: {Math.min(n, goal.target)} / {goal.target}
          {n >= goal.target ? " ✓" : ""}
        </p>
      )}
    </div>
  );
}

export function YearInReview() {
  const router = useRouter();
  const params = useSearchParams();
  const status = useLibrary((st) => st.status);
  const entries = useLibrary((st) => st.entries);
  const events = useLibrary((st) => st.progressEvents);
  const currentYear = useLibrary((st) => st.currentYear);
  const goals = useLibrary((st) => st.goals);
  const now = useNow();
  const year = Number(params.get("year")) || currentYear;
  const [index, setIndex] = useState(0);

  const stats = useMemo(() => (year && now ? computeYearStats(entries, events, year, now) : null), [entries, events, year, now]);
  const goal = goals.find((g) => g.year === year);
  const slides = useMemo(() => (stats && stats.finished.length ? buildSlides(stats, goal) : []), [stats, goal]);
  const last = slides.length - 1;

  const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(last, i))), [last]);
  const exit = useCallback(() => router.push("/stats"), [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, exit]);

  if (status !== "ready" || !stats) {
    return <div aria-busy="true" className="fixed inset-0" style={{ background: GROUNDS[0] }} />;
  }

  if (!slides.length) {
    return (
      <div className="fixed inset-0 grid place-items-center p-6 text-center" style={{ background: GROUNDS[0], color: CREAM }}>
        <div className="max-w-sm">
          <h1 className="font-heading text-3xl font-semibold">Your {year} story starts with one book</h1>
          <p className="mt-3 opacity-80">Finish a book this year and your Year in Review will be waiting here.</p>
          <Link href="/library" className="mt-6 inline-flex h-11 items-center rounded-md bg-[#faf8f5] px-5 font-semibold text-[#2c2420]">
            Back to your library
          </Link>
        </div>
      </div>
    );
  }

  const slide = slides[Math.min(index, last)];
  const ground = slide.id === "summary" ? "#2c2420" : GROUNDS[index % GROUNDS.length];

  return (
    <div
      className="fixed inset-0 cursor-pointer overflow-hidden transition-colors duration-500 select-none"
      style={{ background: ground, color: CREAM }}
      // Tap anywhere: left third of the screen goes back, the rest goes forward.
      // Real links and buttons keep working, and tall slides still scroll.
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return;
        go(e.clientX < window.innerWidth / 3 ? index - 1 : index + 1);
      }}
    >
      <title>{`Your ${year} in books — Bookshelf`}</title>
      <section
        aria-roledescription="story"
        aria-label={`Your ${year} in books`}
        className="relative mx-auto flex h-full max-w-xl flex-col px-6 pt-5 pb-6"
      >
        {/* Progress: one segment per slide; each is a button to jump there. */}
        <div className="flex gap-1.5">
          {slides.map((sl, i) => (
            <button
              key={sl.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}: ${sl.label}`}
              aria-current={i === index ? "step" : undefined}
              className="group h-6 flex-1 py-2.5"
            >
              <span className={`block h-1 rounded-full transition-colors ${i <= index ? "bg-[#faf8f5]" : "bg-[#faf8f5]/25 group-hover:bg-[#faf8f5]/45"}`} />
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="opacity-70">
            {index + 1} / {slides.length}
          </span>
          <button type="button" onClick={exit} aria-label="Close year in review" className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-white/10">
            <X aria-hidden size={22} />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center">
          <div
            key={slide.id}
            aria-live="polite"
            className="animate-slide-up max-h-full w-full overflow-y-auto py-6 [scrollbar-color:rgba(250,248,245,0.25)_transparent] [scrollbar-width:thin]"
          >
            <h1 className="sr-only">
              Slide {index + 1} of {slides.length}: {slide.label}
            </h1>
            {slide.render()}
            {slide.id === "summary" && (
              <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
                <p className="w-full text-center opacity-70">Take a screenshot to share your year.</p>
                <button type="button" onClick={() => go(0)} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/30 px-4 hover:bg-white/10">
                  <RotateCcw aria-hidden size={16} /> Replay
                </button>
                <Link href="/stats" className="inline-flex h-11 items-center rounded-full bg-[#faf8f5] px-5 font-semibold text-[#2c2420]">
                  See all stats
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="inline-flex h-11 items-center gap-1 rounded-full px-3 text-sm hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft aria-hidden size={18} /> Back
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === last}
            className="inline-flex h-11 items-center gap-1 rounded-full bg-white/10 px-4 text-sm font-medium hover:bg-white/20 disabled:opacity-30"
          >
            Next <ChevronRight aria-hidden size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
