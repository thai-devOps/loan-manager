export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "monely-theme";
const LEGACY_THEME_STORAGE_KEYS = ["vayly-theme", "loan-manager-theme"];

function readThemeStorage(): string | null {
  try {
    const current = localStorage.getItem(THEME_STORAGE_KEY);
    if (current) return current;
    for (const key of LEGACY_THEME_STORAGE_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy) return legacy;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getStoredTheme(): Theme {
  const value = readThemeStorage();
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme;
}

export function applyTheme(theme: Theme): "light" | "dark" {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  return resolved;
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    for (const key of LEGACY_THEME_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
