"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyThemePreference, readThemePreference, type ThemePreference } from "@/lib/theme";

const NEXT: Record<ThemePreference, ThemePreference> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<ThemePreference, string> = { system: "System theme", light: "Light theme", dark: "Dark theme" };
const ICON = { system: Monitor, light: Sun, dark: Moon };

/** Cycles system → light → dark. The choice persists in localStorage. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [pref, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    // Sync with the value the inline script already applied.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPref(readThemePreference());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => readThemePreference() === "system" && applyThemePreference("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const Icon = ICON[pref];
  const next = NEXT[pref];
  return (
    <button
      type="button"
      onClick={() => {
        applyThemePreference(next);
        setPref(next);
      }}
      className={`grid size-11 place-items-center rounded-md text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary ${className}`}
      aria-label={`${LABEL[pref]} — switch to ${LABEL[next].toLowerCase()}`}
      title={LABEL[pref]}
    >
      <Icon aria-hidden size={20} strokeWidth={1.75} />
    </button>
  );
}
