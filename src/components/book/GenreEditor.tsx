"use client";

import { Plus, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useLibrary } from "@/lib/store/library-store";
import type { LibraryEntry } from "@/lib/types";

const MAX_TAGS = 8;

/**
 * Add, remove and reuse genre tags. Suggestions come from tags already used
 * across the library (most-used first), so the taxonomy stays consistent
 * without anyone typing from scratch.
 */
export function GenreEditor({ entry }: { entry: LibraryEntry }) {
  const setGenres = useLibrary((s) => s.setGenres);
  const entries = useLibrary((s) => s.entries);
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const listId = useId();
  const tags = entry.book.genres;

  const suggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) for (const g of e.book.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
    const have = new Set(tags.map((t) => t.toLowerCase()));
    return [...counts.entries()]
      .filter(([g]) => !have.has(g.toLowerCase()))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([g]) => g);
  }, [entries, tags]);

  const add = (raw: string) => {
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name) return;
    // Reuse the library's existing spelling/casing when it matches.
    const existing = suggestions.find((g) => g.toLowerCase() === name.toLowerCase());
    const tag = existing ?? name.charAt(0).toUpperCase() + name.slice(1);
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setAnnouncement(`${tag} is already tagged.`);
      return;
    }
    setGenres(entry.id, [...tags, tag]);
    setAnnouncement(`Added genre ${tag}.`);
    setValue("");
  };

  const remove = (tag: string) => {
    setGenres(entry.id, tags.filter((t) => t !== tag));
    setAnnouncement(`Removed genre ${tag}.`);
  };

  return (
    <div className="mt-4">
      <ul aria-label="Genres" className="flex flex-wrap items-center gap-1.5">
        {tags.map((g) => (
          <li key={g} className="inline-flex items-center rounded-sm bg-bg-tertiary pl-2 text-xs text-text-secondary">
            {g}
            <button
              type="button"
              onClick={() => remove(g)}
              aria-label={`Remove genre ${g}`}
              className="grid size-7 place-items-center rounded-sm text-text-tertiary hover:text-error"
            >
              <X aria-hidden size={12} />
            </button>
          </li>
        ))}
        <li>
          {adding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                add(value);
              }}
              className="inline-flex items-center gap-1"
            >
              <label htmlFor={`${listId}-input`} className="sr-only">
                Add a genre
              </label>
              <input
                id={`${listId}-input`}
                list={listId}
                value={value}
                autoFocus
                maxLength={32}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
                onBlur={() => !value && setAdding(false)}
                placeholder="e.g. Book club pick"
                className="h-8 w-40 rounded-sm border border-border bg-surface px-2 text-xs focus:border-accent focus:outline-none"
              />
              <datalist id={listId}>
                {suggestions.slice(0, 30).map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <button type="submit" className="h-8 rounded-sm bg-accent px-2 text-xs font-semibold text-bg-primary hover:bg-accent-hover">
                Add
              </button>
            </form>
          ) : (
            tags.length < MAX_TAGS && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex h-7 items-center gap-1 rounded-sm border border-dashed border-border px-2 text-xs text-text-tertiary hover:border-accent hover:text-accent"
              >
                <Plus aria-hidden size={12} /> {tags.length ? "Add genre" : "Add a genre"}
              </button>
            )
          )}
        </li>
      </ul>
      {adding && suggestions.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-text-tertiary">
          Your tags:
          {suggestions.slice(0, 5).map((g) => (
            <button
              key={g}
              type="button"
              // Keep the input open: pointer-down fires before the input's blur.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(g)}
              className="rounded-sm border border-border px-1.5 py-0.5 hover:border-accent hover:text-accent"
            >
              {g}
            </button>
          ))}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
