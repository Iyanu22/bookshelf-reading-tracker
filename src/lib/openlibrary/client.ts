"use client";

import type { Book } from "../types";

export interface BooksPage {
  books: Book[];
  total: number;
  page: number;
  hasMore: boolean;
}

export type FetchError = { code: string; message: string };

export const ERROR_COPY: Record<string, { title: string; body: string }> = {
  "rate-limited": {
    title: "Open Library needs a short breather",
    body: "We've sent a lot of requests in a short time. Wait about 10 seconds, then try again.",
  },
  timeout: {
    title: "Open Library is responding slowly",
    body: "The book catalogue didn't answer in time. It's usually temporary — try again in a moment.",
  },
  unavailable: {
    title: "Open Library is unavailable right now",
    body: "We couldn't reach the book catalogue. Your library is unaffected — try again shortly.",
  },
  offline: {
    title: "You appear to be offline",
    body: "Check your internet connection, then try again. Your shelves still work offline in this tab.",
  },
  "bad-response": {
    title: "We got an unexpected response",
    body: "Open Library sent data we couldn't read. Try a slightly different search.",
  },
};

// Session-level cache: back/forward and repeat requests cost nothing.
const cache = new Map<string, BooksPage>();
let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1000; // Open Library asks for ≤1 request/second.

/** Fetches one of our /api/books/* endpoints with caching, throttling and typed errors. */
export async function fetchBooks(endpoint: "search" | "genre", params: Record<string, string>): Promise<BooksPage> {
  const qs = new URLSearchParams(params).toString();
  const key = `${endpoint}?${qs.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  let res: Response;
  try {
    res = await fetch(`/api/books/${endpoint}?${qs}`);
  } catch {
    throw { code: navigator.onLine ? "unavailable" : "offline", message: "" } satisfies FetchError;
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) throw (body?.error ?? { code: "unavailable", message: "" }) as FetchError;
  cache.set(key, body);
  return body as BooksPage;
}
