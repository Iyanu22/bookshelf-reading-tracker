"use client";

import { BookCheck, Sparkles } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  crossedMilestone,
  currentPosition,
  finishEstimate,
  progressUnit,
  quickSteps,
  totalUnits,
} from "@/lib/progress";
import { useLibrary } from "@/lib/store/library-store";
import { useNow } from "@/lib/use-now";
import type { LibraryEntry } from "@/lib/types";
import { ProgressBar } from "../ui/ProgressBar";
import { RelativeTime } from "../ui/RelativeTime";

export function progressText(entry: LibraryEntry) {
  const p = entry.progress;
  if (!p) return "Not started";
  if (entry.book.pageCount && p.currentPage !== null) return `Page ${p.currentPage} of ${entry.book.pageCount}`;
  return `${p.percent}% read`;
}

const shortDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const longDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

function EstimateLine({ entry, events }: { entry: LibraryEntry; events: Parameters<typeof finishEstimate>[1] }) {
  // Counted from today: if you pause for a week, the pace (and finish date) honestly reflects it.
  const now = useNow();
  const est = finishEstimate(entry, events, now);
  if (est.remaining === 0) return <>Finished</>;
  const left = est.unit === "pages" ? `${est.remaining} ${est.remaining === 1 ? "page" : "pages"} left` : `${est.remaining}% to go`;
  // `now` is 0 until the clock mounts; pages-left doesn't depend on time.
  if (!now || !est.finishDate || !est.daysLeft) return <>{left}</>;
  const sameYear = est.finishDate.getFullYear() === new Date(now).getFullYear();
  const when = est.daysLeft === 1 ? "tomorrow" : (sameYear ? shortDate : longDate).format(est.finishDate);
  return (
    <>
      {left}
      <span aria-hidden className="mx-1">·</span>
      <span title="Estimated from your recent reading pace" className="whitespace-nowrap">
        est. finish {when}
      </span>
    </>
  );
}

/**
 * Reading progress with as little friction as possible:
 * - one tap for the common case (+10 / +25 / +50 pages, or +5 / +10 / +25%)
 * - an exact page when precision matters
 * - pages left and a pace-based finish estimate, so each update feels like progress
 * - small moments at halfway, 90% and the last page
 */
export function ProgressUpdater({ entry, size = "sm" }: { entry: LibraryEntry; size?: "sm" | "md" }) {
  const updateProgress = useLibrary((s) => s.updateProgress);
  const moveEntry = useLibrary((s) => s.moveEntry);
  const readShelf = useLibrary((s) => s.shelves.find((x) => x.kind === "read"));
  const allEvents = useLibrary((s) => s.progressEvents);
  const events = useMemo(() => allEvents.filter((e) => e.entryId === entry.id), [allEvents, entry.id]);

  const inputId = useId();
  const unit = progressUnit(entry);
  const total = totalUnits(entry);
  const position = currentPosition(entry);
  const percent = entry.progress?.percent ?? 0;

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [finishedPrompt, setFinishedPrompt] = useState(false);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const milestoneTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(milestoneTimer.current), []);

  async function commit(next: { to: number } | { by: number }) {
    // Read the latest state so rapid taps stack instead of overwriting each other.
    const latest = useLibrary.getState().entries.find((e) => e.id === entry.id) ?? entry;
    const beforePercent = latest.progress?.percent ?? 0;
    const raw = "to" in next ? next.to : currentPosition(latest) + next.by;
    const target = Math.min(total, Math.max(0, Math.round(raw)));
    const { finished } = await updateProgress(entry.id, unit === "pages" ? { page: target } : { percent: target });

    const after = useLibrary.getState().entries.find((e) => e.id === entry.id);
    const afterPercent = after?.progress?.percent ?? 0;
    setAnnouncement(after ? `${progressText(after)}, ${afterPercent}% read.` : "");
    if (finished) {
      setFinishedPrompt(true);
      return;
    }
    const hit = crossedMilestone(beforePercent, afterPercent);
    if (hit) {
      setAnnouncement((a) => `${a} ${hit.message}`);
      setMilestone(hit.message);
      clearTimeout(milestoneTimer.current);
      milestoneTimer.current = setTimeout(() => setMilestone(null), 5000);
    }
  }

  const n = Number(value);
  const valid = value !== "" && Number.isFinite(n) && n >= 0 && n <= total;
  const btn = "inline-flex h-11 items-center justify-center rounded-md text-sm font-medium transition-colors lg:h-9";

  return (
    <div>
      <ProgressBar
        size={size}
        value={percent}
        label={progressText(entry)}
        valueText={`${percent}%`}
        tone={percent >= 100 ? "success" : "progress"}
      />
      {/* Milestones replace the estimate line instead of adding one, so buttons never shift mid-tap. */}
      <p className="mt-1.5 flex min-h-5 items-center text-xs text-text-tertiary">
        {milestone ? (
          <span className="inline-flex animate-fade-in items-center gap-1 font-semibold text-accent">
            <Sparkles aria-hidden size={13} /> {milestone}
          </span>
        ) : (
          <span>
            <EstimateLine entry={entry} events={events} />
          </span>
        )}
      </p>

      {/* Announced after every update, including one-tap ones. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>


      {finishedPrompt && readShelf ? (
        <div role="status" className="mt-3 animate-fade-in rounded-lg bg-success/10 p-3 text-sm">
          <p className="font-medium text-success">You reached the last page! 🎉</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => moveEntry(entry.id, readShelf.id)}
              className="inline-flex h-11 items-center gap-1.5 rounded-md bg-success px-3 font-semibold text-bg-primary lg:h-10"
            >
              <BookCheck aria-hidden size={16} /> Mark as read
            </button>
            <button
              type="button"
              onClick={() => setFinishedPrompt(false)}
              className="h-11 rounded-md px-3 text-text-secondary hover:bg-bg-tertiary lg:h-10"
            >
              Not yet
            </button>
          </div>
        </div>
      ) : editing ? (
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valid) return;
            setEditing(false);
            await commit({ to: n });
          }}
        >
          <div>
            <label htmlFor={inputId} className="block text-xs text-text-tertiary">
              {unit === "pages" ? `Current page (of ${total})` : "Percent read (no page count)"}
            </label>
            <div className="mt-1 flex items-center gap-1.5">
              <input
                id={inputId}
                type="number"
                inputMode="numeric"
                min={0}
                max={total}
                value={value}
                autoFocus
                onFocus={(e) => e.target.select()}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
                aria-invalid={!valid}
                className="h-11 w-24 rounded-md border border-border bg-surface px-2.5 tabular-nums focus:border-accent focus:outline-none lg:h-9"
              />
              {unit === "percent" && <span className="text-sm text-text-tertiary">%</span>}
            </div>
          </div>
          <button type="submit" disabled={!valid} className={`${btn} bg-accent px-3 font-semibold text-bg-primary hover:bg-accent-hover disabled:opacity-50`}>
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className={`${btn} px-2 text-text-secondary hover:bg-bg-tertiary`}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <div role="group" aria-label={`Quick update for ${entry.book.title}`} className="flex gap-1.5">
            {quickSteps(entry).map((step) => (
              <button
                key={step}
                type="button"
                disabled={position >= total}
                onClick={() => commit({ by: step })}
                aria-label={unit === "pages" ? `Add ${step} pages` : `Add ${step} percent`}
                className={`${btn} min-w-11 border border-border bg-surface px-2.5 text-text-secondary tabular-nums hover:border-accent hover:text-accent active:scale-95 disabled:opacity-40`}
              >
                +{step}
                {unit === "percent" ? "%" : ""}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setValue(String(position));
              setEditing(true);
            }}
            className={`${btn} px-2.5 text-accent hover:bg-accent-subtle`}
          >
            {unit === "pages" ? "Set page" : "Set %"}
            <span className="sr-only"> for {entry.book.title}</span>
          </button>
          {entry.progress && (
            <span className="ml-auto text-xs text-text-tertiary">
              Updated <RelativeTime iso={entry.progress.updatedAt} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
