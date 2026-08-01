// ==============================================
// COLOR INPUT
// The brand and accent pickers: a swatch that opens
// the native color picker, plus a hex field. The
// accent stays auto-derived until the user types or
// picks one, which locks it.
// ==============================================
import { useState } from "react"
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
      <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md ring-1 ring-inset ring-ink/15">
        <span className="block h-full w-full" style={{ backgroundColor: color }} />
        <input
          type="color"
          value={color}
          onChange={(e) => {
            onCommit(e.target.value)
            setDraft(e.target.value.replace("#", ""))
            setInvalid(false)
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
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
