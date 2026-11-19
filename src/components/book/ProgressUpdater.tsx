"use client";

import { BookCheck } from "lucide-react";
import { useId, useState } from "react";
import { useLibrary } from "@/lib/store/library-store";
import type { LibraryEntry } from "@/lib/types";
import { RelativeTime } from "../ui/RelativeTime";

export function progressText(entry: LibraryEntry) {
  const p = entry.progress;
  if (!p) return "Not started";
  if (entry.book.pageCount && p.currentPage !== null) return `Page ${p.currentPage} of ${entry.book.pageCount}`;
  return `${p.percent}% read`;
}

/**
 * Inline progress control — no modal, no navigation. Uses page numbers when
 * the book has a page count, and falls back to a percentage when it doesn't.
 */
export function ProgressUpdater({ entry, compact = false }: { entry: LibraryEntry; compact?: boolean }) {
  const updateProgress = useLibrary((s) => s.updateProgress);
  const moveEntry = useLibrary((s) => s.moveEntry);
  const readShelf = useLibrary((s) => s.shelves.find((x) => x.kind === "read"));
  const id = useId();
  const pages = entry.book.pageCount;
  const usePages = pages !== null;
  const current = usePages ? (entry.progress?.currentPage ?? 0) : (entry.progress?.percent ?? 0);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(current));
  const [finishedPrompt, setFinishedPrompt] = useState(false);

  const max = usePages ? pages! : 100;
  const n = Number(value);
  const valid = value !== "" && Number.isFinite(n) && n >= 0 && n <= max;

  if (finishedPrompt && readShelf) {
    return (
      <div role="status" className="rounded-lg bg-success/10 p-3 text-sm">
        <p className="font-medium text-success">You reached the last page!</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => moveEntry(entry.id, readShelf.id)}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-success px-3 font-semibold text-bg-primary"
          >
            <BookCheck aria-hidden size={16} /> Mark as read
          </button>
          <button
            type="button"
            onClick={() => setFinishedPrompt(false)}
            className="h-10 rounded-md px-3 text-text-secondary hover:bg-bg-tertiary"
          >
            Not yet
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {!compact && entry.progress && (
          <p className="text-xs text-text-tertiary">
            Updated <RelativeTime iso={entry.progress.updatedAt} />
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setValue(String(current));
            setOpen(true);
          }}
          className="-mx-2 inline-flex h-10 items-center rounded-md px-2 text-sm font-medium text-accent hover:bg-accent-subtle"
        >
          Update progress<span className="sr-only"> for {entry.book.title}</span>
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setOpen(false);
        const { finished } = await updateProgress(entry.id, usePages ? { page: n } : { percent: n });
        if (finished) setFinishedPrompt(true);
      }}
    >
      <div className="min-w-0">
        <label htmlFor={id} className="block text-xs text-text-tertiary">
          {usePages ? `Current page (of ${pages})` : "Percent read (no page count)"}
        </label>
        <div className="mt-1 flex items-center gap-1.5">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={0}
            max={max}
            value={value}
            autoFocus
            onFocus={(e) => e.target.select()}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            aria-invalid={!valid}
            className="h-10 w-24 rounded-md border border-border bg-surface px-2.5 tabular-nums focus:border-accent focus:outline-none"
          />
          {!usePages && <span className="text-sm text-text-tertiary">%</span>}
        </div>
      </div>
      <button
        type="submit"
        disabled={!valid}
        className="h-10 rounded-md bg-accent px-3 text-sm font-semibold text-bg-primary hover:bg-accent-hover disabled:opacity-50"
      >
        Save
      </button>
      <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-md px-2 text-sm text-text-secondary hover:bg-bg-tertiary">
        Cancel
      </button>
    </form>
  );
}
