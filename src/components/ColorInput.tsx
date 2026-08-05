// ==============================================
// COLOR INPUT
// The brand and accent pickers: a swatch that opens
// the native color picker, plus a hex field. The
// accent stays auto-derived until the user types or
// picks one, which locks it.
// ==============================================
import { useEffect, useRef, useState } from "react"
import { HexColorPicker } from "react-colorful"
import { parseColorInput, formatColor, type ColorFormat } from "../lib/color"
import { cn } from "../shared/utils"
import { FieldLabel } from "../shared/components/Label"

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
    <div className="max-w-[268px] min-w-[180px] flex-1">
      <FieldLabel>Brand</FieldLabel>
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
    <div className={cn(showAccent2 ? "min-w-[300px] flex-[3]" : "min-w-[128px] flex-1")}>
      <FieldLabel
        aside={
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
        }
      >
        Accent
      </FieldLabel>
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
  const [focused, setFocused] = useState(false)

  // Compact at rest so two accents fit side by side; the full CSS value on
  // focus, since that's the form you'd want to read, copy or replace.
  const display = formatColor(color, format, !focused)

  const commit = (raw: string) => {
    // Takes any CSS notation, so a field showing `oklch(...)` accepts one back,
    // along with a pasted hex or the compact form shown at rest.
    const hex = parseColorInput(raw, format)
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
          // The value grows on focus, so any click position would be wrong
          // anyway — selecting it makes that shift deliberate rather than jarring.
          onFocus={(e) => {
            setFocused(true)
            e.target.select()
          }}
          onBlur={(e) => {
            setFocused(false)
            commit(e.target.value)
          }}
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
