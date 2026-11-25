import { BarChart3, BookOpen, LibraryBig, Target } from "lucide-react";
import Link from "next/link";
import sampleBooks from "../../data/sample-books.json";
import { BookCover } from "@/components/book/BookCover";
import { Logo } from "@/components/ui/Logo";

type Sample = { title: string; author: string; coverUrl: string | null };
const byTitle = (t: string) => (sampleBooks as Sample[]).find((b) => b.title.startsWith(t))!;

const SHOWCASE = ["Project Hail Mary", "Circe", "Educated", "Dune", "The Name of the Wind", "Normal People", "Atomic Habits", "Beloved"].map(byTitle);

const FEATURES = [
  {
    icon: LibraryBig,
    title: "Shelves that feel like yours",
    body: "Want to Read, Currently Reading and Read — plus as many custom shelves as you like. Book Club, Lent Out, Comfort Reads.",
  },
  {
    icon: BookOpen,
    title: "Progress without the friction",
    body: "Log your page in a couple of taps, right from your library. No page count? Track by percentage instead.",
  },
  {
    icon: Target,
    title: "A goal that keeps you honest",
    body: "Set a yearly target and see at a glance whether you're ahead, on track or behind — without the guilt trip.",
  },
  {
    icon: BarChart3,
    title: "Your year, in books",
    body: "Pages turned, genres explored, your best months. A reflection of your reading life worth sharing.",
  },
];

/** Same cover component as the app: optimized, CDN-cached, with a styled fallback for missing covers. */
function Cover({ book, size = "sm", eager = false, decorative = false }: { book: Sample; size?: "xs" | "sm"; eager?: boolean; decorative?: boolean }) {
  return (
    <BookCover
      book={{ title: book.title, authors: [book.author], coverUrl: book.coverUrl }}
      size={size}
      priority={eager}
      decorative={decorative}
    />
  );
}

function ShowcaseCard() {
  const reading = SHOWCASE.slice(0, 3);
  const percents = [65, 47, 30];
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      {/* Floating cover stack */}
      <div aria-hidden className="absolute -top-6 -right-2 hidden w-24 rotate-6 sm:block lg:-right-6 lg:w-28">
        <Cover book={SHOWCASE[3]} eager decorative />
      </div>
      <div aria-hidden className="absolute -bottom-8 -left-4 hidden w-20 -rotate-6 sm:block lg:-left-10 lg:w-24">
        <Cover book={SHOWCASE[4]} eager decorative />
      </div>

      <figure className="relative rounded-2xl border border-border-subtle bg-surface p-5 shadow-lg sm:p-6">
        <figcaption className="sr-only">A preview of a Bookshelf library: three books in progress and a reading goal.</figcaption>
        <div className="flex items-baseline justify-between">
          <p className="font-heading text-lg font-semibold">Currently Reading</p>
          <p className="text-sm text-text-tertiary">3 books</p>
        </div>
        <ul className="mt-4 space-y-4">
          {reading.map((b, i) => (
            <li key={b.title} className="flex items-center gap-4">
              <div className="w-12 shrink-0">
                <Cover book={b} size="xs" eager decorative />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading font-medium">{b.title}</p>
                <p className="truncate text-sm text-text-tertiary">{b.author}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-tertiary">
                    <div className="h-full rounded-full bg-progress" style={{ width: `${percents[i]}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-accent tabular-nums">{percents[i]}%</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center gap-4 rounded-xl bg-bg-secondary p-4">
          <svg viewBox="0 0 36 36" className="size-14 shrink-0 -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" className="stroke-bg-tertiary" />
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray="94.2" strokeDashoffset="25" className="stroke-progress" />
          </svg>
          <div>
            <p className="font-heading text-lg">
              <span className="font-bold">18</span> of 24 books
            </p>
            <p className="text-sm text-success">↗ Ahead of pace by 1 book</p>
          </div>
        </div>
      </figure>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      <header className="mx-auto flex h-20 max-w-page items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link href="/sign-in" className="inline-flex h-11 items-center rounded-md px-3 text-sm font-medium text-text-secondary hover:text-text-primary">
            Sign in
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-page items-center gap-16 px-5 pt-8 pb-20 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-16 lg:pb-28">
          <div>
            <p className="text-sm font-semibold tracking-wider text-accent uppercase">A personal reading tracker</p>
            <h1 className="mt-4 text-4xl leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Your reading life, beautifully organized.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
              Bookshelf is a quiet, considered home for the books you&apos;ve read, the one on your nightstand, and the
              stack you&apos;ll get to someday. No feeds, no strangers, no ads — just your books.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-accent px-7 text-base font-semibold text-bg-primary shadow-sm transition-colors hover:bg-accent-hover"
              >
                Sign up — it&apos;s free
              </Link>
              {/* A plain anchor: /guest is a route handler that starts the guest session. */}
              <a
                href="/guest"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-text-primary/80 px-7 text-base font-semibold text-text-primary transition-colors hover:bg-text-primary hover:text-bg-primary"
              >
                Try as guest
              </a>
            </div>
            <p className="mt-4 text-sm text-text-tertiary">
              Guest mode opens a sample library of 45 books. No account needed.
            </p>
          </div>
          <ShowcaseCard />
        </section>

        <section aria-labelledby="shelf-heading" className="border-y border-border-subtle bg-bg-secondary">
          <div className="mx-auto max-w-page px-5 py-16 sm:px-8">
            <h2 id="shelf-heading" className="text-center font-heading text-2xl font-semibold sm:text-3xl">
              Every cover, right where you left it
            </h2>
            <ul className="mx-auto mt-10 grid max-w-library grid-cols-4 gap-3 sm:grid-cols-8 sm:gap-5" aria-label="Sample books">
              {SHOWCASE.map((b, i) => (
                <li key={b.title} className={i % 2 ? "sm:translate-y-4" : ""}>
                  <Cover book={b} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="mx-auto max-w-page px-5 py-20 sm:px-8 lg:py-28">
          <h2 id="features-heading" className="max-w-2xl text-3xl font-semibold text-balance sm:text-4xl">
            Everything a reader needs. Nothing they don&apos;t.
          </h2>
          <ul className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <span className="grid size-11 place-items-center rounded-lg bg-accent-subtle text-accent">
                  <Icon aria-hidden size={22} strokeWidth={1.75} />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 leading-relaxed text-text-secondary">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-page px-5 pb-24 sm:px-8">
          <div className="rounded-2xl bg-text-primary px-6 py-14 text-center text-bg-primary sm:px-12">
            <h2 className="font-heading text-3xl font-semibold text-balance">Start with the book you&apos;re reading now.</h2>
            <p className="mx-auto mt-3 max-w-lg text-bg-primary/80">
              Create an account to keep your shelves, progress and notes in sync across devices — or look around first.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-bg-primary px-7 font-semibold text-text-primary hover:bg-bg-secondary"
              >
                Create your library
              </Link>
              <a
                href="/guest"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-bg-primary/60 px-7 font-semibold text-bg-primary hover:bg-bg-primary/10"
              >
                Explore the sample library
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-page flex-col gap-2 px-5 py-8 text-sm text-text-tertiary sm:flex-row sm:justify-between sm:px-8">
          <p>Bookshelf — a Frontend Mentor product challenge.</p>
          <p>
            Book data from{" "}
            <a href="https://openlibrary.org" className="underline underline-offset-2 hover:text-text-primary">
              Open Library
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
