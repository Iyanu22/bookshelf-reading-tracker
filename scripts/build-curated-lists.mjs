// Resolves the hand-picked Discover lists against Open Library once, at
// authoring time, and writes verified metadata (work id, cover, pages, year)
// to src/lib/discover/curated-lists.json. The Discover page then renders
// instantly with zero runtime API calls.
//
//   node scripts/build-curated-lists.mjs            # resolve new/missing books only
//   node scripts/build-curated-lists.mjs --refresh  # re-resolve everything
//
// Open Library asks for at most ~1 request/second, so this takes about a minute.

import { readFile, writeFile } from "node:fs/promises";

const LISTS = [
  {
    id: "modern-classics",
    title: "Modern classics worth the hype",
    blurb: "The books everyone seems to have read — and for good reason.",
    books: [
      ["The Remains of the Day", "Kazuo Ishiguro"],
      ["The Book Thief", "Markus Zusak"],
      ["Life of Pi", "Yann Martel"],
      ["The Kite Runner", "Khaled Hosseini"],
      ["Station Eleven", "Emily St. John Mandel"],
      ["Never Let Me Go", "Kazuo Ishiguro"],
    ],
  },
  {
    id: "around-the-world",
    title: "Voices from around the world",
    blurb: "Stories that travel — from Umuofia to Macondo to Osaka.",
    books: [
      ["Things Fall Apart", "Chinua Achebe"],
      ["Half of a Yellow Sun", "Chimamanda Ngozi Adichie"],
      ["One Hundred Years of Solitude", "Gabriel García Márquez"],
      ["The God of Small Things", "Arundhati Roy"],
      ["Pachinko", "Min Jin Lee"],
      ["Purple Hibiscus", "Chimamanda Ngozi Adichie"],
    ],
  },
  {
    id: "developers",
    title: "Books developers love",
    blurb: "For the craft beyond the code: systems, teams and how computers really work.",
    books: [
      ["Code: The Hidden Language of Computer Hardware and Software", "Charles Petzold"],
      ["The Phoenix Project", "Gene Kim"],
      ["Peopleware", "Tom DeMarco"],
      ["Working Effectively with Legacy Code", "Michael Feathers"],
      ["Code Complete", "Steve McConnell"],
      ["Structure and Interpretation of Computer Programs", "Harold Abelson"],
    ],
  },
  {
    id: "weekend-reads",
    title: "Finish it this weekend",
    blurb: "Short, unforgettable books — perfect for getting a reading streak going.",
    books: [
      ["Of Mice and Men", "John Steinbeck"],
      ["The Old Man and the Sea", "Ernest Hemingway"],
      ["Animal Farm", "George Orwell"],
      ["Fahrenheit 451", "Ray Bradbury"],
      ["Siddhartha", "Hermann Hesse"],
      ["Breakfast at Tiffany's", "Truman Capote"],
    ],
  },
  {
    id: "big-ideas",
    title: "Big ideas, beautifully told",
    blurb: "Non-fiction that changes how you see the world, without reading like homework.",
    books: [
      ["Guns, Germs, and Steel", "Jared Diamond"],
      ["The Sixth Extinction", "Elizabeth Kolbert"],
      ["Freakonomics", "Steven D. Levitt"],
      ["The Gene: An Intimate History", "Siddhartha Mukherjee"],
      ["Being Mortal", "Atul Gawande"],
      ["Outliers", "Malcolm Gladwell"],
    ],
  },
  {
    id: "other-worlds",
    title: "Worlds to get lost in",
    blurb: "Science fiction and fantasy with unforgettable settings.",
    books: [
      ["The Hobbit", "J.R.R. Tolkien"],
      ["A Wizard of Earthsea", "Ursula K. Le Guin"],
      ["The Martian", "Andy Weir"],
      ["The Lies of Locke Lamora", "Scott Lynch"],
      ["Hyperion", "Dan Simmons"],
      ["Foundation", "Isaac Asimov"],
    ],
  },
];

const FIELDS = "key,title,author_name,first_publish_year,number_of_pages_median,cover_i,isbn,edition_count";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const mainTitle = (s) => norm(s.split(/[:(]/)[0]);

/**
 * The first search hit is often the wrong work (an omnibus, a sequel, a
 * picture-book spin-off, a translator listed first). Score the top candidates
 * on exact title, author surname, cover and edition count instead.
 */
function score(doc, title, author) {
  if (!doc.title || !doc.key) return -1;
  const want = mainTitle(title);
  const got = mainTitle(doc.title);
  let s = 0;
  if (norm(doc.title) === norm(title) || got === want) s += 10;
  else if (got.startsWith(want) && got.split(" ").length <= want.split(" ").length + 1) s += 4;
  else return -1;
  const surname = norm(author).split(" ").at(-1);
  if ((doc.author_name ?? []).some((a) => norm(a).includes(surname))) s += 6;
  if (doc.cover_i) s += 2;
  if (doc.number_of_pages_median) s += 1;
  return s + Math.min(3, Math.log10((doc.edition_count ?? 1) + 1));
}

async function search(params) {
  const url = new URL("https://openlibrary.org/search.json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("limit", "20");
  const res = await fetch(url, { headers: { "User-Agent": "Bookshelf/0.1 (personal reading tracker)" } });
  if (!res.ok) throw new Error(`${res.status}`);
  return (await res.json()).docs ?? [];
}

async function resolve(title, author) {
  let docs = await search({ title: mainTitle(title), author: norm(author).split(" ").at(-1) });
  let best = docs.map((d) => [score(d, title, author), d]).filter(([s]) => s >= 14).sort((a, b) => b[0] - a[0])[0];
  if (!best) {
    await sleep(1100);
    docs = await search({ q: `${title} ${author}` });
    best = docs.map((d) => [score(d, title, author), d]).filter(([s]) => s >= 14).sort((a, b) => b[0] - a[0])[0];
  }
  if (!best) return null;
  const doc = best[1];
  const isbns = doc.isbn ?? [];
  return {
    // Display our curated title/author: API records often list translators or
    // native-script names first. Everything else comes from Open Library.
    title,
    authors: [author],
    openLibraryId: doc.key.replace("/works/", ""),
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    pageCount: doc.number_of_pages_median ?? null,
    publishedYear: doc.first_publish_year ?? null,
    isbn13: isbns.find((i) => i.length === 13) ?? null,
    isbn10: isbns.find((i) => i.length === 10) ?? null,
    matchedTitle: doc.title,
  };
}

const OUTPUT = new URL("../src/lib/discover/curated-lists.json", import.meta.url);

// Reuse previous resolutions: Open Library answers vary between calls, so a
// book that resolved once stays pinned. Pass --refresh to look everything up again.
const previous = new Map();
if (!process.argv.includes("--refresh")) {
  try {
    for (const l of JSON.parse(await readFile(OUTPUT, "utf8"))) for (const b of l.books) previous.set(b.title, b);
  } catch {}
}

const out = [];
const misses = [];
for (const list of LISTS) {
  const books = [];
  for (const [title, author] of list.books) {
    const cached = previous.get(title);
    const book = cached ?? (await resolve(title, author).catch((e) => (console.error(e.message), null)));
    if (book) books.push(book);
    else misses.push(`${title} — ${author}`);
    process.stdout.write(cached ? "=" : book ? "." : "x");
    if (!cached) await sleep(1100);
  }
  out.push({ id: list.id, title: list.title, blurb: list.blurb, books });
}

await writeFile(OUTPUT, JSON.stringify(out, null, 2) + "\n");
console.log(`\nWrote ${out.reduce((n, l) => n + l.books.length, 0)} books in ${out.length} lists.`);
if (misses.length) console.log("Not found:\n  " + misses.join("\n  "));
