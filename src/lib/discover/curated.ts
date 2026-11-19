import { bookKey } from "../books";
import type { Book } from "../types";
import lists from "./curated-lists.json";

export interface CuratedList {
  id: string;
  title: string;
  blurb: string;
  books: Book[];
}

/**
 * Hand-picked starter lists, resolved against Open Library ahead of time by
 * scripts/build-curated-lists.mjs — so they render instantly with real covers
 * and need no API calls.
 */
export const CURATED_LISTS: CuratedList[] = lists.map((list) => ({
  id: list.id,
  title: list.title,
  blurb: list.blurb,
  books: list.books.map((b) => {
    const partial = { title: b.title, authors: b.authors, isbn13: b.isbn13, openLibraryId: b.openLibraryId };
    return {
      ...partial,
      key: bookKey(partial),
      coverUrl: b.coverUrl,
      pageCount: b.pageCount,
      publishedYear: b.publishedYear,
      isbn10: b.isbn10,
      publisher: null,
      description: null,
      genres: [],
    };
  }),
}));
