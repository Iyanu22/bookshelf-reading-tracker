"use client";

import { Pencil, Target } from "lucide-react";
import { useState } from "react";
import { goalPace } from "@/lib/books";
import { useGoalProgress } from "@/lib/store/hooks";
import { useLibrary } from "@/lib/store/library-store";
import { PaceBadge } from "./GoalSummary";

function GoalRing({ percent, complete }: { percent: number; complete: boolean }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="size-28 shrink-0 -rotate-90" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-bg-tertiary" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - percent / 100)}
        className={`transition-[stroke-dashoffset] duration-1000 ease-out ${complete ? "stroke-success" : "stroke-progress"}`}
      />
    </svg>
  );
}

function GoalForm({ year, initial, onDone }: { year: number; initial?: number; onDone: () => void }) {
  const setGoal = useLibrary((s) => s.setGoal);
  const [value, setValue] = useState(String(initial ?? 24));
  const n = Number(value);
  const valid = Number.isInteger(n) && n >= 1 && n <= 999;

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        await setGoal(year, n);
        onDone();
      }}
    >
      <div>
        <label htmlFor="goal-target" className="block text-sm font-medium text-text-secondary">
          Books to read in {year}
        </label>
        <input
          id="goal-target"
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={!valid}
          aria-describedby="goal-hint"
          className="mt-1.5 h-11 w-28 rounded-md border border-border bg-surface px-3 text-lg tabular-nums focus:border-accent focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={!valid}
        className="h-11 rounded-md bg-accent px-5 font-semibold text-bg-primary hover:bg-accent-hover disabled:opacity-50"
      >
        Save goal
      </button>
      {initial !== undefined && (
        <button type="button" onClick={onDone} className="h-11 rounded-md px-4 text-text-secondary hover:bg-bg-tertiary">
          Cancel
        </button>
      )}
      <p id="goal-hint" className="w-full text-sm text-text-tertiary">
        {valid ? `That's about ${(n / 12).toFixed(1).replace(/\.0$/, "")} a month.` : "Enter a number between 1 and 999."}
      </p>
    </form>
  );
}

export function GoalCard() {
  const { goal, completed, year } = useGoalProgress();
  const [editing, setEditing] = useState(false);

  if (year === null) return null;

  if (!goal || editing) {
    return (
      <section id="goal" aria-labelledby="goal-heading" className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2 text-accent">
          <Target aria-hidden size={20} />
          <h2 id="goal-heading" className="text-lg font-semibold text-text-primary">
            {goal ? `Edit your ${year} goal` : `Set a reading goal for ${year}`}
          </h2>
        </div>
        {!goal && (
          <p className="mt-2 text-text-secondary">
            A gentle target to keep you reading. We&apos;ll show whether you&apos;re ahead or behind — no guilt.
          </p>
        )}
        <div className="mt-5">
          <GoalForm year={year} initial={goal?.target} onDone={() => setEditing(false)} />
        </div>
      </section>
    );
  }

  const pace = goalPace(goal, completed);
  const complete = pace.status === "complete";

  return (
    <section
      id="goal"
      aria-labelledby="goal-heading"
      className={`relative overflow-hidden rounded-xl border p-6 shadow-sm ${
        complete ? "border-success/40 bg-success/5" : "border-border-subtle bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="goal-heading" className="text-lg font-semibold">
          {year} reading goal
        </h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="-m-2 inline-flex h-10 items-center gap-1.5 rounded-md px-2 text-sm text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary"
        >
          <Pencil aria-hidden size={14} /> Edit<span className="sr-only"> goal</span>
        </button>
      </div>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative">
          <GoalRing percent={pace.percent} complete={complete} />
          <span className="absolute inset-0 grid place-items-center font-heading text-xl font-bold">{pace.percent}%</span>
        </div>
        <div className="min-w-0">
          <p className="font-heading text-text-primary">
            <span className="text-3xl font-bold">{completed}</span>
            <span className="text-lg text-text-secondary"> of {goal.target} books</span>
          </p>
          <div className="mt-1">
            <PaceBadge status={pace.status} booksAhead={pace.booksAhead} />
          </div>
          <p className="mt-1 text-sm text-text-tertiary">
            {complete
              ? completed > goal.target
                ? `${completed - goal.target} past your goal — every one is a bonus.`
                : "Every book from here is a bonus."
              : `About ${Math.round(pace.expected)} by today keeps you on pace.`}
          </p>
        </div>
      </div>
      {complete && (
        <p className="mt-5 rounded-lg bg-success/10 px-4 py-3 font-heading text-lg text-success" role="status">
          🎉 You reached your {year} goal. What a year of reading.
        </p>
      )}
    </section>
  );
}
