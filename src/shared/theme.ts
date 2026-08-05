// ==============================================
// THEME
// Light/dark for the whole family: read a stored
// preference, else the OS setting, else light; apply
// it by toggling `.dark` on <html>; write it back.
//
// Deliberately NOT part of URL state. The query
// string carries the artifact someone made, and a
// shared link shouldn't force the recipient into the
// author's viewing preference.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import { useEffect, useState } from "react"

export type Theme = "light" | "dark"

const STORAGE_KEY = "theme"

/** Stored preference, else the OS setting, else light. */
export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === "light" || saved === "dark") return saved
  } catch {
    // Ignore storage failures (private mode / sandbox).
  }
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark"
  }
  return "light"
}

/**
 * The theme, plus the effect that applies and persists it. Every tool calls
 * this once; nothing else in the app should touch the `.dark` class.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Ignore storage failures.
    }
  }, [theme])

  return {
    theme,
    setTheme,
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  }
}
