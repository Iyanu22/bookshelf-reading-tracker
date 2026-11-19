"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useCallback, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Chart card: title, optional legend, the chart, and its table twin.  */
/* ------------------------------------------------------------------ */

export interface TableView {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}

export function ChartCard({
  title,
  subtitle,
  legend,
  table,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  table?: TableView;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();
  return (
    <figure
      aria-labelledby={headingId}
      className={`flex min-w-0 flex-col rounded-xl border border-border-subtle bg-surface p-5 shadow-sm sm:p-6 ${className}`}
    >
      <figcaption>
        <h2 id={headingId} className="font-sans text-base font-semibold text-text-primary">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-text-tertiary">{subtitle}</p>}
      </figcaption>
      {legend && <div className="mt-3">{legend}</div>}
      <div className="mt-5 flex-1">{children}</div>
      {table && (
        <details className="group mt-4 border-t border-border-subtle pt-3 text-sm">
          <summary className="cursor-pointer text-text-tertiary select-none hover:text-text-primary">
            <span className="group-open:hidden">Show as table</span>
            <span className="hidden group-open:inline">Hide table</span>
          </summary>
          <div className="mt-3 max-h-72 overflow-auto">
            <table className="w-full text-left tabular-nums">
              <caption className="sr-only">{table.caption}</caption>
              <thead>
                <tr className="border-b border-border-subtle text-text-tertiary">
                  {table.columns.map((c) => (
                    <th key={c} scope="col" className="py-1.5 pr-4 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-b border-border-subtle/60 last:border-0">
                    {r.map((cell, j) =>
                      j === 0 ? (
                        <th key={j} scope="row" className="py-1.5 pr-4 font-normal text-text-secondary">
                          {cell}
                        </th>
                      ) : (
                        <td key={j} className="py-1.5 pr-4 text-text-primary">
                          {cell}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}

/** Legend keys mirror the mark: a small rounded rect for bars. Text stays in text tokens. */
export function Legend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-[3px] ${it.className}`} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip: hover AND keyboard focus show the same readout.            */
/* ------------------------------------------------------------------ */

export interface TipContent {
  value: string;
  label: string;
  rows?: { key: string; value: string; swatch?: string }[];
}

interface TipState extends TipContent {
  x: number;
  y: number;
}

export function useChartTooltip() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TipState | null>(null);

  const show = useCallback((target: Element, content: TipContent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const a = target.getBoundingClientRect();
    const b = wrap.getBoundingClientRect();
    setTip({ ...content, x: a.left - b.left + a.width / 2, y: a.top - b.top });
  }, []);
  const hide = useCallback(() => setTip(null), []);

  const tooltip = tip ? (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 w-max max-w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
      style={{
        left: `clamp(4.5rem, ${tip.x}px, calc(100% - 4.5rem))`,
        top: tip.y - 8,
      }}
    >
      {/* Values lead, labels follow. */}
      <p className="text-sm font-semibold text-text-primary">{tip.value}</p>
      <p className="text-text-tertiary">{tip.label}</p>
      {tip.rows && (
        <ul className="mt-1.5 space-y-0.5">
          {tip.rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2">
              {r.swatch && <span aria-hidden className={`h-0.5 w-3 rounded ${r.swatch}`} />}
              <span className="text-text-secondary">{r.key}</span>
              <span className="ml-auto font-medium text-text-primary">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : null;

  return { wrapRef, show, hide, tooltip };
}

/* ------------------------------------------------------------------ */
/* Roving focus: one tab stop per chart, arrow keys move between marks. */
/* ------------------------------------------------------------------ */

export function useRovingFocus(count: number, opts: { columns?: number } = {}) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  const move = (next: number) => {
    const clamped = Math.max(0, Math.min(count - 1, next));
    setActive(clamped);
    refs.current[clamped]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const step = opts.columns ?? 1; // grid: up/down jump a column's height
    const map: Record<string, number> = {
      ArrowRight: opts.columns ? step : 1,
      ArrowLeft: opts.columns ? -step : -1,
      ArrowDown: 1,
      ArrowUp: -1,
    };
    if (e.key in map) {
      e.preventDefault();
      move(active + map[e.key]);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(0);
    } else if (e.key === "End") {
      e.preventDefault();
      move(count - 1);
    }
  };

  const itemProps = (i: number) => ({
    ref: (el: HTMLElement | null) => {
      refs.current[i] = el;
    },
    tabIndex: i === active ? 0 : -1,
    onKeyDown,
    onFocus: () => setActive(i),
  });

  return { itemProps };
}

/* ------------------------------------------------------------------ */
/* Stat tile: label · value · delta (direction in words + icon).       */
/* ------------------------------------------------------------------ */

export function StatTile({
  label,
  value,
  delta,
  note,
}: {
  label: string;
  value: ReactNode;
  delta?: { percent: number | null; versus: string } | null;
  note?: string;
}) {
  let deltaEl: ReactNode = null;
  if (delta && delta.percent !== null) {
    const p = delta.percent;
    const Icon = p > 0 ? ArrowUpRight : p < 0 ? ArrowDownRight : Minus;
    const words = p > 0 ? `${p}% more` : p < 0 ? `${-p}% fewer` : "Same";
    deltaEl = (
      <p className={`mt-1 inline-flex items-center gap-1 text-xs ${p > 0 ? "text-success" : "text-text-tertiary"}`}>
        <Icon aria-hidden size={14} />
        {words} {delta.versus}
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-border-subtle bg-surface px-5 py-4 shadow-sm">
      <dt className="text-sm text-text-tertiary">{label}</dt>
      <dd>
        <span className="mt-1 block font-sans text-3xl font-semibold text-text-primary">{value}</span>
        {deltaEl}
        {note && <span className="mt-1 block text-xs text-text-tertiary">{note}</span>}
      </dd>
    </div>
  );
}

/** Clean, even axis maximum just above the data. */
export function niceMax(max: number) {
  // Always even, so the midline tick (max / 2) is a whole, true value.
  if (max <= 4) return max <= 2 ? 2 : 4;
  const steps = [6, 10, 20, 30, 40, 50, 60, 80, 100, 150, 200, 250, 500, 1000];
  return steps.find((s) => s >= max) ?? Math.ceil(max / 1000) * 1000;
}
