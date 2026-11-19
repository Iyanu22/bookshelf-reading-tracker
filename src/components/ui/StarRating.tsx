"use client";

import { Star } from "lucide-react";
import { useId, useState } from "react";

function Stars({ value, size }: { value: number; size: number }) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          size={size}
          strokeWidth={1.5}
          className={n <= value ? "fill-rating text-rating" : "fill-transparent text-text-tertiary"}
        />
      ))}
    </>
  );
}

/** Read-only rating. Filled vs outlined shapes carry meaning, not just colour. */
export function StarDisplay({ value, size = 14 }: { value: number | null; size?: number }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${value} out of 5 stars`}>
      <Stars value={value} size={size} />
    </span>
  );
}

/**
 * Editable rating built on native radio inputs: arrow keys move between
 * stars, and screen readers announce "3 stars, 3 of 5".
 */
export function StarRatingInput({
  value,
  onChange,
  label = "Your rating",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label?: string;
}) {
  const name = useId();
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <fieldset className="flex flex-wrap items-center gap-3">
      <legend className="sr-only">{label}</legend>
      <div className="flex" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="group grid size-11 cursor-pointer place-items-center rounded-md has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
            onMouseEnter={() => setHover(n)}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <span className="sr-only">{n === 1 ? "1 star" : `${n} stars`}</span>
            <Star
              aria-hidden
              size={26}
              strokeWidth={1.5}
              className={`transition-transform duration-150 group-active:scale-90 ${
                n <= shown ? "fill-rating text-rating" : "fill-transparent text-text-tertiary"
              }`}
            />
          </label>
        ))}
      </div>
      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-sm text-text-tertiary underline underline-offset-2 hover:text-text-primary"
        >
          Clear rating
        </button>
      ) : (
        <span className="text-sm text-text-tertiary">Not rated yet</span>
      )}
    </fieldset>
  );
}
