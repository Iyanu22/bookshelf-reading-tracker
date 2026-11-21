"use client";

import { ArrowRight, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatAuthors } from "@/lib/books";
import { searchLibrary } from "@/lib/library-search";
import { useLibrary } from "@/lib/store/library-store";
import { BookCover } from "../book/BookCover";

const MAX_RESULTS = 8;

/** True when the user is typing somewhere, so "/" shouldn't hijack the keystroke. */
const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

/**
 * Quick-find for books you already own — deliberately separate from
 * "Find books to add" (the Open Library catalogue). Opens with ⌘K / Ctrl+K or "/".
 */
export function LibrarySearch() {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const entries = useLibrary((s) => s.entries);
  const shelves = useLibrary((s) => s.shelves);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [mac, setMac] = useState(false);
  const listId = useId();

  const matches = useMemo(() => searchLibrary(entries, query), [entries, query]);
  const shown = matches.slice(0, MAX_RESULTS);
  const shelfName = (id: string) => shelves.find((s) => s.id === id)?.name ?? "";

  const open = () => {
    setQuery("");
    setActive(0);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (dialog.current?.open) close();
        else open();
      } else if (e.key === "/" && !isTyping(e.target) && !dialog.current?.open) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-keyshortcuts="Control+K Meta+K /"
        className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-text-tertiary transition-colors hover:border-text-tertiary hover:text-text-secondary"
      >
        <BookOpen aria-hidden size={16} />
        <span className="hidden md:inline">Search your library</span>
        <span className="sr-only md:hidden">Search your library</span>
        <kbd aria-hidden className="ml-1 hidden rounded border border-border px-1.5 font-sans text-[0.6875rem] md:inline">
          {mac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <dialog
        ref={dialog}
        aria-label="Search your library"
        onClick={(e) => e.target === dialog.current && close()}
        className="mx-auto mt-[12vh] w-[min(36rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-border bg-surface p-0 text-text-primary shadow-lg backdrop:bg-black/40"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const pick = shown[active];
            if (pick) go(`/books/${pick.entry.id}`);
            else if (query.trim()) go(`/shelves/all?q=${encodeURIComponent(query.trim())}`);
          }}
        >
          <div className="flex items-center gap-3 border-b border-border-subtle px-4">
            <Search aria-hidden size={18} className="shrink-0 text-text-tertiary" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(shown.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                }
              }}
              role="combobox"
              aria-expanded={shown.length > 0}
              aria-controls={listId}
              aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
              aria-autocomplete="list"
              aria-label="Search titles, authors and your notes"
              placeholder="Search titles, authors and your notes…"
              className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-text-tertiary"
            />
            <kbd className="rounded border border-border px-1.5 text-[0.6875rem] text-text-tertiary">Esc</kbd>
          </div>
        </form>

        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim() === "" ? (
            <p className="px-4 py-6 text-sm text-text-tertiary">
              Searching your {entries.length} books. Looking for something new?{" "}
              <button type="button" onClick={() => go("/search")} className="text-accent underline underline-offset-2">
                Find books to add
              </button>
              .
            </p>
          ) : shown.length === 0 ? (
            <div className="px-4 py-6 text-sm">
              <p className="font-medium">Nothing in your library matches “{query}”.</p>
              <p className="mt-1 text-text-secondary">
                Check the spelling, try an author&apos;s surname, or{" "}
                <button
                  type="button"
                  onClick={() => go(`/search?q=${encodeURIComponent(query.trim())}`)}
                  className="text-accent underline underline-offset-2"
                >
                  search the catalogue for it
                </button>
                .
              </p>
            </div>
          ) : (
            <ul id={listId} role="listbox" aria-label="Books in your library" className="py-2">
              {shown.map((m, i) => (
                <li
                  key={m.entry.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(`/books/${m.entry.id}`)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2 ${i === active ? "bg-accent-subtle" : ""}`}
                >
                  <div className="w-8 shrink-0">
                    <BookCover book={m.entry.book} size="xs" decorative />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.entry.book.title}</p>
                    <p className="truncate text-xs text-text-tertiary">
                      {formatAuthors(m.entry.book.authors)} · {shelfName(m.entry.shelfId)}
                    </p>
                    {m.snippet && <p className="mt-0.5 truncate font-serif text-xs text-text-secondary italic">In your notes: {m.snippet}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {matches.length > 0 && (
          <div className="border-t border-border-subtle px-4 py-2.5 text-sm">
            <Link
              href={`/shelves/all?q=${encodeURIComponent(query.trim())}`}
              onClick={close}
              className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
            >
              {matches.length > MAX_RESULTS ? `See all ${matches.length} matches` : "Open in All Books"} with filters
              <ArrowRight aria-hidden size={14} />
            </Link>
          </div>
        )}
        <p aria-live="polite" className="sr-only">
          {query.trim() ? `${matches.length} ${matches.length === 1 ? "book" : "books"} found` : ""}
        </p>
      </dialog>
    </>
  );
}
