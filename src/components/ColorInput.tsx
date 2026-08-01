// ==============================================
// COLOR INPUT
// The brand and accent pickers: a swatch that opens
// the native color picker, plus a hex field. The
// accent stays auto-derived until the user types or
// picks one, which locks it.
// ==============================================
import { useEffect, useRef, useState } from "react"
import { HexColorPicker } from "react-colorful"
import { normalizeHex } from "../lib/color"
import { cn } from "../lib/utils"

type Props = {
  brand: string
  onBrandChange: (hex: string) => void
  accentOverride: string | null
  autoAccent: string
  onAccentChange: (hex: string) => void
  onAccentReset: () => void
}

/** Brand color plus an accent that is auto-derived until the user locks it. */
export default function ColorInput({
  brand,
  onBrandChange,
  accentOverride,
  autoAccent,
  onAccentChange,
  onAccentReset,
}: Props) {
  const locked = accentOverride !== null
  const accentValue = accentOverride ?? autoAccent

  return (
    <div className="flex gap-4">
      <div className="min-w-[128px] flex-1">
        <div className="mb-1.5 flex h-4 items-center">
          <FieldLabel>Brand</FieldLabel>
        </div>
        <HexField color={brand} onCommit={onBrandChange} />
      </div>

      <div className="min-w-[128px] flex-1">
        <div className="mb-1.5 flex h-4 items-center justify-between gap-2">
          <FieldLabel>Accent</FieldLabel>
          <button
            type="button"
            onClick={() => (locked ? onAccentReset() : onAccentChange(autoAccent))}
            className="rounded-full bg-ink/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ash transition-colors hover:bg-ink/10 hover:text-ink"
            title={
              locked
                ? "Manual — click to auto-derive the accent from the brand"
                : "Auto-derived from brand — click to set the accent manually"
            }
          >
            {locked ? "Manual" : "Auto"}
          </button>
        </div>
        <HexField color={accentValue} muted={!locked} onCommit={onAccentChange} />
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ash">{children}</span>
  )
}

function HexField({
  color,
  onCommit,
  muted = false,
}: {
  color: string
  onCommit: (hex: string) => void
  muted?: boolean
}) {
  const [draft, setDraft] = useState(color.replace("#", ""))
  const [invalid, setInvalid] = useState(false)

  // Keep the text field in sync when the value changes from outside (e.g. the
  // auto accent tracking the brand color, or a reset).
  const shown = draft.toLowerCase() === color.replace("#", "").toLowerCase() ? draft : color.replace("#", "")

  const commit = (raw: string) => {
    const hex = normalizeHex(raw)
    if (hex) {
      setInvalid(false)
      onCommit(hex)
      setDraft(hex.replace("#", ""))
    } else {
      setInvalid(true)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", muted && "opacity-70")}>
      <SwatchPicker
        color={color}
        onChange={(hex) => {
          onCommit(hex)
          setDraft(hex.replace("#", ""))
          setInvalid(false)
        }}
      />
      <div
        className={cn(
          "flex flex-1 items-center rounded-md border bg-paper px-2.5 py-1.5 font-mono text-sm",
          invalid ? "border-red-400" : "border-line",
        )}
      >
        <span className="text-ash">#</span>
        <input
          value={shown}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur()
          }}
          className="w-full bg-transparent uppercase outline-none"
        />
      </div>
    </div>
  )
}

/**
 * The colour swatch, and the picker it opens.
 *
 * Replaces the browser's native colour chrome, which looks like the OS rather
 * than the app. The hex field beside it stays the precise input — this is for
 * exploring. Closes on outside click or Escape, mirroring SchemeSelect.
 */
function SwatchPicker({
  color,
  onChange,
}: {
  color: string
  onChange: (hex: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Choose color, currently ${color}`}
        aria-expanded={open}
        className="block h-9 w-9 rounded-md ring-1 ring-inset ring-ink/15 transition-transform hover:scale-[1.04]"
        style={{ backgroundColor: color }}
      />
      {open && (
        <div className="ramp-picker absolute left-0 top-full z-30 mt-2 rounded-lg border border-line bg-paper p-2.5 shadow-xl">
          <HexColorPicker color={color} onChange={onChange} />
        </div>
      )}
    </div>
  )
}
