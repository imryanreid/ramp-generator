// ==============================================
// CLIPBOARD
// Copying, plus the `useCopy` hook that drives every
// "Copied" confirmation in the UI. Falls back to the
// legacy execCommand path when the async Clipboard
// API isn't available or is blocked.
// ==============================================
import { useCallback, useRef, useState } from "react"

/**
 * Copy `value` to the clipboard, falling back to execCommand when the async
 * Clipboard API is blocked (e.g. inside a sandboxed preview iframe).
 */
export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Fall through to the legacy path below.
  }
  try {
    const ta = document.createElement("textarea")
    ta.value = value
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** Clipboard copy with a transient `copied` flag that resets after `resetMs`. */
export function useCopy(resetMs = 1100) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(
    async (value: string) => {
      const ok = await copyToClipboard(value)
      if (!ok) return
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), resetMs)
    },
    [resetMs],
  )

  return { copied, copy }
}
