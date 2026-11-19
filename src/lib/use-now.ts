"use client";

import { useSyncExternalStore } from "react";

/**
 * A shared, slow-ticking clock. Components read a stable snapshot instead of
 * calling Date.now() while rendering (which React treats as impure and Cache
 * Components can't prerender). One interval serves every subscriber.
 */
const TICK_MS = 60_000;

let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick() {
  now = Date.now();
  listeners.forEach((l) => l());
}

function onVisible() {
  if (document.visibilityState === "visible") tick();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    tick();
    timer = setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer) clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

const getSnapshot = () => now;
const getServerSnapshot = () => 0;

/** Current time in ms, refreshed every minute and when the tab regains focus. 0 until mounted. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
