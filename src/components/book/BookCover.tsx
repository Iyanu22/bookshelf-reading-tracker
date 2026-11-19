"use client";

import { useState } from "react";
import { coverAtSize, formatAuthors } from "@/lib/books";
import type { Book } from "@/lib/types";

type Size = "xs" | "sm" | "md" | "lg";

const SIZES: Record<Size, { ol: "S" | "M" | "L"; title: string; author: string; pad: string }> = {
  xs: { ol: "M", title: "text-[0.55rem] leading-tight", author: "hidden", pad: "p-1.5" },
  sm: { ol: "M", title: "text-xs leading-snug", author: "text-[0.6rem]", pad: "p-2.5" },
  md: { ol: "M", title: "text-sm leading-snug", author: "text-xs", pad: "p-3" },
  lg: { ol: "L", title: "text-xl leading-snug", author: "text-sm", pad: "p-6" },
};

/** Warm, muted spines so placeholder covers sit naturally among real covers. */
const PALETTE = [
  ["#5b3a29", "#f3e3d3"],
  ["#2f4a3f", "#e3efe6"],
  ["#3b3f5c", "#e5e7f3"],
  ["#7a4b2a", "#fbecd9"],
  ["#4a3b52", "#efe5f3"],
  ["#2d4a5a", "#dfeef5"],
  ["#6b3a3a", "#f6e2e2"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Open Library serves a 1×1 transparent GIF for unknown covers unless
 * `default=false` is set, in which case it 404s — which lets us fall back
 * to the styled placeholder instead of an invisible image.
 */
function coverSrc(url: string, size: "S" | "M" | "L") {
  const sized = coverAtSize(url, size) ?? url;
  if (!sized.includes("covers.openlibrary.org")) return sized;
  return sized.includes("?") ? `${sized}&default=false` : `${sized}?default=false`;
}

interface Props {
  book: Pick<Book, "title" | "authors" | "coverUrl">;
  size?: Size;
  className?: string;
  /** Above-the-fold covers load eagerly; everything else lazy-loads. */
  priority?: boolean;
  /** Set when an adjacent element already names the book, to avoid repetition for screen readers. */
  decorative?: boolean;
}

export function BookCover({ book, size = "md", className = "", priority = false, decorative = false }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const cfg = SIZES[size];
  const label = `Cover of ${book.title} by ${formatAuthors(book.authors)}`;
  const showImage = book.coverUrl && !failed;
  const [bg, fg] = PALETTE[hash(book.title) % PALETTE.length];

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-bg-tertiary shadow-book ${className}`}
    >
      {showImage ? (
        // Plain <img>: covers come from Open Library's CDN at fixed sizes, so
        // routing them through the Next image optimizer would only add latency.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverSrc(book.coverUrl!, cfg.ol)}
          alt={decorative ? "" : label}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          width={size === "lg" ? 500 : 180}
          height={size === "lg" ? 750 : 270}
          ref={(img) => {
            // The image may settle before hydration, when onLoad/onError can't fire.
            if (img?.complete) {
              if (img.naturalWidth > 0) setLoaded(true);
              else setFailed(true);
            }
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      ) : (
        <div
          role={decorative ? undefined : "img"}
          aria-label={decorative ? undefined : label}
          aria-hidden={decorative || undefined}
          className={`flex h-full w-full flex-col justify-between ${cfg.pad}`}
          style={{ background: bg, color: fg }}
        >
          <span aria-hidden className="block h-px w-6 bg-current opacity-50" />
          <span className={`font-heading font-semibold [overflow-wrap:anywhere] line-clamp-5 ${cfg.title}`}>
            {book.title}
          </span>
          <span className={`font-sans opacity-80 line-clamp-2 ${cfg.author}`}>{formatAuthors(book.authors)}</span>
        </div>
      )}
      {/* Subtle spine highlight so covers feel like physical objects. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[3%] bg-gradient-to-r from-black/15 to-transparent"
      />
    </div>
  );
}
