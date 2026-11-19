"use client";

import { useMemo } from "react";
import { finishedInYear } from "../books";
import { countByShelf, useLibrary } from "./library-store";

export function useSortedShelves() {
  const shelves = useLibrary((s) => s.shelves);
  return useMemo(() => [...shelves].sort((a, b) => a.position - b.position), [shelves]);
}

export function useShelfCounts() {
  const entries = useLibrary((s) => s.entries);
  return useMemo(() => countByShelf(entries), [entries]);
}

export function useEntry(id: string | undefined) {
  return useLibrary((s) => (id ? s.entries.find((e) => e.id === id) : undefined));
}

export function useShelf(id: string | undefined) {
  return useLibrary((s) => (id ? s.shelves.find((x) => x.id === id) : undefined));
}

/** Goal for the current year. Year is null until the library has loaded in the browser. */
export function useGoalProgress() {
  const year = useLibrary((s) => s.currentYear);
  const entries = useLibrary((s) => s.entries);
  const goal = useLibrary((s) => (year === null ? undefined : s.goals.find((g) => g.year === year)));
  const completed = useMemo(() => (year === null ? 0 : finishedInYear(entries, year).length), [entries, year]);
  return { goal, completed, year };
}
