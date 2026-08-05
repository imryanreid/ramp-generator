// ==============================================
// RESET BUTTON
// Reset, with a short window to take it back.
//
// The reset is destructive and one click away, so for
// a few seconds afterwards the button becomes the
// undo. That doubles as the confirmation — you can
// see something happened — which is why there's no
// separate checkmark and no dialog.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import { useEffect, useRef, useState } from "react"
import { ArrowCounterClockwise } from "@phosphor-icons/react"
import { cn } from "../utils"

/** How long the undo stays on offer. */
const UNDO_MS = 3500

export default function ResetButton({
  onReset,
  onUndo,
}: {
  onReset: () => void
  onUndo: () => void
}) {
  const [undoable, setUndoable] = useState(false)
  const timer = useRef<number | null>(null)

  const stopTimer = () => window.clearTimeout(timer.current ?? undefined)
  useEffect(() => stopTimer, [])

  // One element throughout, so the width eases and the labels crossfade the way
  // the share and copy buttons do. Swapping between two elements snapped.
  return (
    <button
      type="button"
      onClick={() => {
        stopTimer()
        if (undoable) {
          setUndoable(false)
          onUndo()
          return
        }
        onReset()
        setUndoable(true)
        timer.current = window.setTimeout(() => setUndoable(false), UNDO_MS)
      }}
      title={undoable ? "Restore what you had before resetting" : "Reset to defaults"}
      aria-label={undoable ? "Undo reset" : "Reset to defaults"}
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center justify-center overflow-hidden rounded-md border transition-all duration-300 ease-out hover:-translate-y-0.5",
        undoable
          ? "border-ink/20 text-ink hover:border-ink/40 hover:bg-ink/[0.04] w-[92px]"
          : "border-ink/20 text-ink w-10 hover:border-red-500 hover:bg-red-500/[0.06] hover:text-red-500",
      )}
    >
      <ArrowCounterClockwise
        size={18}
        weight="regular"
        aria-hidden="true"
        className="absolute transition-all duration-200 ease-out"
        style={{ opacity: undoable ? 0 : 1, transform: undoable ? "scale(0.7)" : "none" }}
      />
      <span
        className="absolute inline-flex items-center gap-1.5 font-mono text-xs whitespace-nowrap transition-all duration-200 ease-out"
        style={{ opacity: undoable ? 1 : 0, transform: undoable ? "none" : "scale(0.9)" }}
      >
        <ArrowCounterClockwise size={14} weight="bold" aria-hidden="true" />
        Undo?
      </span>
    </button>
  )
}
