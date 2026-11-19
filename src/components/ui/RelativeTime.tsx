"use client";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const abs = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" });

export function formatRelative(iso: string, now = Date.now()) {
  const diffSec = (new Date(iso).getTime() - now) / 1000;
  const a = Math.abs(diffSec);
  if (a < 60) return "just now";
  if (a < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (a < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), "day");
  return abs.format(new Date(iso));
}

export function formatDate(iso: string) {
  return abs.format(new Date(iso));
}

/** Relative for recent ("2 days ago"), absolute for older ("March 15, 2026"). */
export function RelativeTime({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={formatDate(iso)} suppressHydrationWarning>
      {formatRelative(iso)}
    </time>
  );
}
