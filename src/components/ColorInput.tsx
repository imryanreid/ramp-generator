// ==============================================
// COLOR INPUT
// The brand and accent pickers: a swatch that opens
// the native color picker, plus a hex field. The
// accent stays auto-derived until the user types or
// picks one, which locks it.
// ==============================================
import { useEffect, useRef, useState } from "react"
import { HexColorPicker } from "react-colorful"
import { normalizeHex, formatColor, type ColorFormat } from "../lib/color"
import { cn } from "../lib/utils"

/**
 * Brand and Accent are split into separate exports so the layout can sit Accent
 * directly beside Derivation — the two are coupled (Derivation is what derives
 * the accent while it's on Auto) and the row draws a connector between them.
 */
export function BrandField({
  brand,
  format,
  onBrandChange,
}: {
  brand: string
  format: ColorFormat
  onBrandChange: (hex: string) => void
}) {
  return (
    <div className="min-w-[128px] flex-1">
      <div className="mb-1.5 flex h-4 items-center">
        <FieldLabel>Brand</FieldLabel>
      </div>
      <HexField color={brand} format={format} onCommit={onBrandChange} />
    </div>
  )
}

export function AccentField({
  accentOverride,
  accent2Override,
  autoAccent,
  autoAccent2,
  showAccent2,
  format,
  onAccentChange,
  onAccent2Change,
  onReset,
}: {
  accentOverride: string | null
  accent2Override: string | null
  autoAccent: string
  autoAccent2: string
  showAccent2: boolean
  format: ColorFormat
  onAccentChange: (hex: string) => void
  onAccent2Change: (hex: string) => void
  onReset: () => void
}) {
  // One switch governs both accents. Splitting them would mean two more states
  // to explain for a case nobody has asked for; pinning is all-or-nothing.
  const locked = accentOverride !== null || accent2Override !== null

  return (
    <div className={cn("flex-1", showAccent2 ? "min-w-[248px]" : "min-w-[128px]")}>
      <div className="mb-1.5 flex h-4 items-center justify-between gap-2">
        <FieldLabel>Accent</FieldLabel>
        <button
          type="button"
          onClick={() => {
            if (locked) {
              onReset()
              return
            }
            onAccentChange(autoAccent)
            if (showAccent2) onAccent2Change(autoAccent2)
          }}
          className="bg-ink/[0.06] text-ash hover:bg-ink/10 hover:text-ink rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase transition-colors"
          title={
            locked
              ? "Manual — click to auto-derive the accents from the brand"
              : "Auto-derived from brand — click to set the accents manually"
          }
        >
          {locked ? "Manual" : "Auto"}
        </button>
      </div>
      <div className="flex gap-2">
        <HexField
          color={accentOverride ?? autoAccent}
          muted={!locked}
          format={format}
          onCommit={onAccentChange}
        />
        {showAccent2 && (
          <HexField
            color={accent2Override ?? autoAccent2}
            muted={!locked}
            format={format}
            onCommit={onAccent2Change}
          />
        )}
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-ash font-mono text-[11px] tracking-[0.14em] uppercase">
      {children}
    </span>
  )
}

function HexField({
  color,
  format,
  onCommit,
  muted = false,
}: {
  color: string
  format: ColorFormat
  onCommit: (hex: string) => void
  muted?: boolean
}) {
  // `null` while not being edited, so the field follows the value from outside
  // (the auto accent tracking the brand, a reset, a format switch) without
  // fighting whatever the user is halfway through typing.
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const display = formatColor(color, format)

  const commit = (raw: string) => {
    // normalizeHex takes any CSS notation, so a field showing `oklch(...)`
    // accepts one back — as well as a pasted hex.
    const hex = normalizeHex(raw)
    setDraft(null)
    if (hex) {
      setInvalid(false)
      onCommit(hex)
    } else {
      setInvalid(true)
    }
  }

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2", muted && "opacity-70")}>
      <SwatchPicker
        color={color}
        onChange={(hex) => {
          onCommit(hex)
          setDraft(null)
          setInvalid(false)
        }}
      />
      <div
        className={cn(
          "bg-paper flex h-9 min-w-0 flex-1 items-center rounded-md border px-2.5 font-mono text-sm",
          invalid ? "border-red-400" : "border-line",
        )}
      >
        <input
          value={draft ?? display}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur()
          }}
          // Uppercase suits a hex; it would mangle `oklch(...)`.
          className={cn(
            "w-full min-w-0 bg-transparent outline-none",
            format === "hex" && "uppercase",
          )}
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
function SwatchPicker({ color, onChange }: { color: string; onChange: (hex: string) => void }) {
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
        className="ring-ink/15 block h-9 w-9 rounded-md ring-1 transition-transform ring-inset hover:scale-[1.04]"
        style={{ backgroundColor: color }}
      />
      {open && (
        <div className="ramp-picker border-line bg-paper absolute top-full left-0 z-30 mt-2 rounded-lg border p-2.5 shadow-xl">
          <HexColorPicker color={color} onChange={onChange} />
        </div>
      )}
    </div>
  )
}
