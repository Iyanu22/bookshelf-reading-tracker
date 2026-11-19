"use client";

import { Library, LibraryBig, Search, X } from "lucide-react";
import Link from "next/link";
import { Suspense, useRef, type ReactNode } from "react";
import { useGoalProgress } from "@/lib/store/hooks";
import { useLibrary } from "@/lib/store/library-store";
import { GoalSummary } from "../goal/GoalSummary";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { AccountMenu } from "./AccountMenu";
import { GuestBanner } from "./GuestBanner";
import { ShelfNav } from "./ShelfNav";
import { Toaster } from "./Toaster";

function NavFallback() {
  return <div aria-hidden className="mx-3 h-64 animate-pulse rounded-lg bg-bg-tertiary/60" />;
}

function SidebarGoal() {
  const { goal, completed, year } = useGoalProgress();
  if (!goal) {
    return (
      <Link href="/library#goal" className="block text-sm text-text-secondary hover:text-accent">
        <span className="block text-xs font-semibold tracking-wider text-text-tertiary uppercase">Reading goal</span>
        <span className="mt-1 block underline underline-offset-2">Set a goal for {year} →</span>
      </Link>
    );
  }
  return <GoalSummary goal={goal} completed={completed} />;
}

function MobileShelvesSheet() {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-text-secondary"
      >
        <LibraryBig aria-hidden size={22} strokeWidth={1.75} />
        Shelves
      </button>
      <dialog
        ref={ref}
        aria-label="Shelves"
        onClick={(e) => e.target === ref.current && close()}
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-bg-secondary p-0 text-text-primary shadow-lg backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <h2 className="text-lg font-semibold">Your shelves</h2>
          <button type="button" onClick={close} className="grid size-11 place-items-center rounded-md" aria-label="Close shelves">
            <X aria-hidden size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Suspense fallback={<NavFallback />}>
            <ShelfNav onNavigate={close} />
          </Suspense>
        </div>
      </dialog>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const status = useLibrary((s) => s.status);
  const error = useLibrary((s) => s.error);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[var(--spacing-sidebar)_1fr]">
      <a
        href="#main"
        className="fixed top-2 left-2 z-50 -translate-y-20 rounded-md bg-accent px-4 py-2 text-bg-primary focus:translate-y-0"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden border-r border-border-subtle bg-bg-secondary lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="px-5 pt-6 pb-4">
          <Logo href="/library" />
        </div>
        <nav aria-label="Library" className="flex-1 overflow-y-auto px-4 py-2">
          <Suspense fallback={<NavFallback />}>
            <ShelfNav />
          </Suspense>
        </nav>
        {status === "ready" && (
          <div className="border-t border-border-subtle px-5 py-5">
            <SidebarGoal />
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border-subtle bg-bg-primary/85 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Logo href="/library" className="lg:hidden" />
          <Link
            href="/search"
            className="ml-auto hidden h-11 w-full max-w-72 items-center gap-2.5 rounded-md border border-border bg-surface px-3 text-sm text-text-tertiary transition-colors hover:border-text-tertiary sm:flex"
          >
            <Search aria-hidden size={16} />
            Find books to add…
          </Link>
          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>

        <GuestBanner />

        <main id="main" tabIndex={-1} className="flex-1 px-4 pt-6 pb-28 outline-none sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
          {status === "error" ? (
            <div role="alert" className="mx-auto max-w-md rounded-xl border border-border bg-surface p-8 text-center">
              <h1 className="text-xl font-semibold">Your library didn&apos;t load</h1>
              <p className="mt-2 text-text-secondary">{error}</p>
              <button
                type="button"
                onClick={() => location.reload()}
                className="mt-6 h-11 rounded-md bg-accent px-5 font-semibold text-bg-primary hover:bg-accent-hover"
              >
                Try again
              </button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border-subtle bg-bg-secondary/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <Link href="/library" className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-text-secondary">
          <Library aria-hidden size={22} strokeWidth={1.75} />
          Library
        </Link>
        <MobileShelvesSheet />
        <Link href="/search" className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-text-secondary">
          <Search aria-hidden size={22} strokeWidth={1.75} />
          Search
        </Link>
      </nav>

      <Toaster />
    </div>
  );
}
