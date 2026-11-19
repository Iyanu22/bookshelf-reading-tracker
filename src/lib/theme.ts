export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "bookshelf-theme";

/**
 * Runs synchronously in <head> before first paint so the page never flashes
 * the wrong theme. Kept tiny and dependency-free on purpose.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function applyThemePreference(pref: ThemePreference) {
  if (pref === "system") localStorage.removeItem(THEME_STORAGE_KEY);
  else localStorage.setItem(THEME_STORAGE_KEY, pref);
  const dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
