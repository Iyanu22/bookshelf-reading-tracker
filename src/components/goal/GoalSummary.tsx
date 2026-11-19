"use client";

import { ArrowDownRight, ArrowUpRight, Check, Minus, PartyPopper } from "lucide-react";
import { goalPace, type PaceStatus } from "@/lib/books";
import type { ReadingGoal } from "@/lib/types";
import { ProgressBar } from "../ui/ProgressBar";

export const PACE_COPY: Record<PaceStatus, { label: string; icon: typeof Check; className: string }> = {
  complete: { label: "Goal complete", icon: PartyPopper, className: "text-success" },
  ahead: { label: "Ahead of pace", icon: ArrowUpRight, className: "text-success" },
  "on-track": { label: "On track", icon: Minus, className: "text-accent" },
  behind: { label: "Behind pace", icon: ArrowDownRight, className: "text-warning" },
};

export function PaceBadge({ status, booksAhead }: { status: PaceStatus; booksAhead: number }) {
  const { label, icon: Icon, className } = PACE_COPY[status];
  const detail =
    status === "ahead"
      ? ` by ${booksAhead} ${booksAhead === 1 ? "book" : "books"}`
      : status === "behind"
        ? ` by ${-booksAhead} ${booksAhead === -1 ? "book" : "books"}`
        : "";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${className}`}>
      <Icon aria-hidden size={16} strokeWidth={2} />
      {label}
      {detail}
    </span>
  );
}

/** Compact goal readout for the sidebar. */
export function GoalSummary({ goal, completed }: { goal: ReadingGoal; completed: number }) {
  const pace = goalPace(goal, completed);
  return (
    <div>
      <p className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Reading goal</p>
      <p className="mt-2 flex items-baseline justify-between">
        <span className="font-heading text-lg text-text-primary">
          <span className="text-xl font-semibold">{completed}</span> / {goal.target} books
        </span>
        <span className="text-sm text-text-tertiary">{goal.year}</span>
      </p>
      <ProgressBar
        className="mt-2"
        value={pace.percent}
        label={`${goal.year} reading goal`}
        showLabel={false}
        tone={pace.status === "complete" ? "success" : "progress"}
      />
      <p className="mt-2 text-xs text-text-tertiary">
        {pace.status === "complete"
          ? "You did it! 🎉"
          : `${pace.percent}% complete · ${pace.remaining} ${pace.remaining === 1 ? "book" : "books"} to go`}
      </p>
    </div>
  );
}
