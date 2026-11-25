"use client";

import { useEffect, useRef } from "react";
import { MONTHS, MONTHS_LONG, type HeatDay, type Ranked } from "@/lib/stats";
import { niceMax, useChartTooltip, useRovingFocus } from "./ChartKit";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ------------------------------------------------------------------ */
/* Column chart. Optional context series = emphasis form: the year in  */
/* focus in copper, the comparison year in recessive gray — one axis.   */
/* ------------------------------------------------------------------ */

export function ColumnChart({
  labels,
  longLabels,
  values,
  context,
  seriesName,
  contextName,
  unit,
  highlightMax = true,
  ariaLabel,
}: {
  labels: string[];
  longLabels?: string[];
  values: number[];
  context?: number[];
  seriesName: string;
  contextName?: string;
  unit: [string, string];
  highlightMax?: boolean;
  ariaLabel: string;
}) {
  const { wrapRef, show, hide, tooltip } = useChartTooltip();
  const { itemProps } = useRovingFocus(labels.length);
  const max = niceMax(Math.max(1, ...values, ...(context ?? [])));
  const peak = highlightMax ? values.indexOf(Math.max(...values)) : -1;
  const fmt = (n: number) => plural(n, unit[0], unit[1]);

  const tip = (i: number) => ({
    value: fmt(values[i]),
    label: `${longLabels?.[i] ?? labels[i]} · ${seriesName}`,
    rows: context ? [{ key: contextName ?? "Comparison", value: fmt(context[i]), swatch: "bg-viz-context" }] : undefined,
  });

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex gap-2">
        {/* Y axis: clean ticks, hairline grid. */}
        <div aria-hidden className="flex h-44 flex-col justify-between text-right text-[0.6875rem] text-text-tertiary tabular-nums">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-44">
            <div className="absolute inset-x-0 top-[0.4rem] border-t border-viz-grid" />
            <div className="absolute inset-x-0 top-1/2 border-t border-viz-grid" />
            <div className="absolute inset-x-0 bottom-0 border-t border-border" />
          </div>
          <div role="group" aria-label={ariaLabel} className="relative flex h-44 items-end" onPointerLeave={hide}>
            {labels.map((label, i) => {
              const h = (values[i] / max) * 100;
              const hc = context ? (context[i] / max) * 100 : 0;
              return (
                <div
                  key={label}
                  {...itemProps(i)}
                  role="img"
                  aria-label={`${longLabels?.[i] ?? label}: ${fmt(values[i])}${context ? `; ${contextName}: ${fmt(context[i])}` : ""}`}
                  onPointerEnter={(e) => show(e.currentTarget, tip(i))}
                  onFocus={(e) => {
                    itemProps(i).onFocus();
                    show(e.currentTarget, tip(i));
                  }}
                  onBlur={hide}
                  // The whole slot is the hit target, not just the painted bar.
                  className="group relative flex h-full flex-1 items-end justify-center gap-[2px] rounded-sm outline-offset-0 hover:bg-bg-tertiary/50 focus-visible:bg-bg-tertiary/50"
                >
                  {context && (
                    <div className="w-full max-w-3 rounded-t-[4px] bg-viz-context" style={{ height: `${hc}%` }} />
                  )}
                  <div className="relative w-full max-w-3 rounded-t-[4px] bg-viz-series transition-[height] duration-700 ease-out sm:max-w-[1.125rem]" style={{ height: `${h}%` }}>
                    {i === peak && values[i] > 0 && (
                      <span aria-hidden className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-text-primary">
                        {values[i]}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div aria-hidden className="mt-2 flex text-center text-[0.6875rem] text-text-tertiary">
            {labels.map((l, i) => (
              <span key={l} className={`flex-1 ${labels.length > 6 && i % 2 ? "max-sm:invisible" : ""}`}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
      {tooltip}
    </div>
  );
}

export const MonthlyChart = (props: { values: number[]; context?: number[]; year: number }) => (
  <ColumnChart
    labels={MONTHS}
    longLabels={MONTHS_LONG}
    values={props.values}
    context={props.context}
    seriesName={String(props.year)}
    contextName={String(props.year - 1)}
    unit={["book", "books"]}
    ariaLabel={`Books finished per month in ${props.year}${props.context ? `, compared with ${props.year - 1}` : ""}`}
  />
);

/* ------------------------------------------------------------------ */
/* Ranked horizontal bars: one hue, value at the tip, largest first.    */
/* ------------------------------------------------------------------ */

export function RankedBars({ data, unit, keepOrder = false }: { data: Ranked[]; unit: [string, string]; keepOrder?: boolean }) {
  const rows = keepOrder ? data : [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li
          key={r.label}
          className="grid grid-cols-[minmax(5.5rem,9rem)_1fr] items-center gap-3 text-sm"
          aria-label={`${r.label}: ${plural(r.value, unit[0], unit[1])}`}
        >
          <span aria-hidden className="truncate text-text-secondary" title={r.label}>
            {r.label}
          </span>
          <span aria-hidden className="flex items-center gap-2">
            <span
              className="h-3 rounded-r-[4px] bg-viz-series transition-[width] duration-700 ease-out"
              style={{ width: r.value ? `max(4px, calc((100% - 2.5rem) * ${r.value / max}))` : 0 }}
            />
            <span className="text-xs font-medium text-text-primary tabular-nums">{r.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar heatmap: weeks as columns, days as rows, one copper ramp.   */
/* ------------------------------------------------------------------ */

const HEAT = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];
const dayFmt = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" });

export function ReadingHeatmap({ days, year }: { days: HeatDay[]; year: number }) {
  const { wrapRef, show, hide, tooltip } = useChartTooltip();
  // Pad the first week so Jan 1 lands on its weekday row (Sunday-first).
  const lead = new Date(year, 0, 1).getDay();
  const cells: (HeatDay | null)[] = [...Array<null>(lead).fill(null), ...days];
  const weeks = Math.ceil(cells.length / 7);
  const { itemProps } = useRovingFocus(days.length, { columns: 7 });

  // Month labels sit above the week where each month starts.
  const monthStarts = MONTHS.map((m, i) => ({
    label: m,
    week: Math.floor((lead + days.findIndex((d) => d.date === `${year}-${String(i + 1).padStart(2, "0")}-01`)) / 7),
  }));

  const tip = (d: HeatDay) => ({
    value: d.future ? "—" : d.pages ? plural(d.pages, "page") : "No reading",
    label: dayFmt.format(new Date(`${d.date}T12:00:00`)),
  });

  // On narrow screens cells keep a usable size and the calendar scrolls inside
  // its card (never the page), opening on the most recent weeks.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [year]);

  return (
    <div ref={wrapRef} className="relative">
      <div ref={scroller} className="overflow-x-auto pb-1 [scrollbar-width:thin]">
      <div style={{ minWidth: `${weeks * 0.75}rem` }}>
      <div aria-hidden className="relative mb-1 h-4 text-[0.6875rem] text-text-tertiary">
        {monthStarts.map((m) => (
          <span key={m.label} className="absolute" style={{ left: `${(m.week / weeks) * 100}%` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div
        role="group"
        aria-label={`Reading activity by day in ${year}. Use arrow keys to move between days.`}
        className="grid grid-flow-col gap-[2px]"
        style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))", gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
        onPointerLeave={hide}
      >
        {cells.map((d, i) =>
          d === null ? (
            <span key={`pad-${i}`} aria-hidden />
          ) : (
            <span
              key={d.date}
              {...itemProps(i - lead)}
              role="img"
              aria-label={`${tip(d).label}: ${tip(d).value}`}
              onPointerEnter={(e) => show(e.currentTarget, tip(d))}
              onFocus={(e) => {
                itemProps(i - lead).onFocus();
                show(e.currentTarget, tip(d));
              }}
              onBlur={hide}
              className={`aspect-square rounded-[2px] outline-offset-1 hover:ring-1 hover:ring-text-primary/40 ${
                d.future ? "bg-transparent ring-1 ring-border-subtle ring-inset" : HEAT[d.level]
              }`}
            />
          ),
        )}
      </div>
      </div>
      </div>
      <div aria-hidden className="mt-3 flex items-center justify-end gap-1.5 text-[0.6875rem] text-text-tertiary">
        Less
        {HEAT.map((c) => (
          <span key={c} className={`size-2.5 rounded-[2px] ${c}`} />
        ))}
        More
      </div>
      {tooltip}
    </div>
  );
}
