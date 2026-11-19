interface Props {
  value: number;
  label: string;
  /** Visible text next to the bar, e.g. "65%" or "page 210 of 476". */
  valueText?: string;
  showLabel?: boolean;
  tone?: "progress" | "success";
  size?: "sm" | "md";
  className?: string;
}

export function ProgressBar({
  value,
  label,
  valueText,
  showLabel = true,
  tone = "progress",
  size = "sm",
  className = "",
}: Props) {
  const pct = Math.min(100, Math.max(0, value));
  const text = valueText ?? `${Math.round(pct)}%`;
  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
          <span className="text-text-tertiary">{label}</span>
          <span className="font-semibold text-accent tabular-nums">{text}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-valuetext={text}
        className={`overflow-hidden rounded-full bg-bg-tertiary ${size === "sm" ? "h-1.5" : "h-2.5"}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)] ${
            tone === "success" ? "bg-success" : "bg-progress"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
