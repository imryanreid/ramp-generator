// ==============================================
// COLOR INPUT
// The brand and accent pickers: a swatch that opens
// the native color picker, plus a hex field. The
// accent stays auto-derived until the user types or
// picks one, which locks it.
// ==============================================
import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { HexColorPicker } from "react-colorful"
import { WarningCircle } from "@phosphor-icons/react"
import { parseColorInput, formatColor, type ColorFormat } from "../lib/color"
import type { Vividness } from "../lib/recommend"
import { cn } from "../shared/utils"
import { POPOVER, POPOVER_ORIGIN } from "../shared/motion"
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
  vividness,
  boldLifts,
  onVividnessChange,
  onAccentChange,
  onAccent2Change,
}: {
  accentOverride: string | null
  accent2Override: string | null
  autoAccent: string
  autoAccent2: string
  showAccent2: boolean
  format: ColorFormat
  vividness: Vividness
  /**
   * False when the brand already carries enough chroma that the bold floor has
   * nothing to lift. Computed in lib/recommend, beside the floor it compares
   * against, rather than re-derived here.
   */
  boldLifts: boolean
  onVividnessChange: (v: Vividness) => void
  onAccentChange: (hex: string) => void
  onAccent2Change: (hex: string) => void
}) {
  // One switch governs both accents. Splitting them would mean two more states
  // to explain for a case nobody has asked for; pinning is all-or-nothing.
  const locked = accentOverride !== null || accent2Override !== null

  // Three ways this control can have nothing to do, and it used to admit only
  // two. Saturation floors the *derived* accents, so pinned ones have nothing
  // to apply to; Lite scope has no accent ramps at all; and a brand already
  // above the floor leaves the floor nothing to lift.
  //
  // That third case is the default brand, which made the first thing most
  // people click do nothing and say nothing about why. Correct maths reads as a
  // dead control unless the control says otherwise.
  //
  // The chip stays visible and explains itself rather than vanishing, so the
  // setting doesn't look like it was lost.
  const inert = locked || !showAccent2 || !boldLifts

  return (
    <div className={cn(showAccent2 ? "min-w-[300px] flex-[3]" : "min-w-[128px] flex-1")}>
      <FieldLabel
        aside={
          <button
            type="button"
            // aria-disabled rather than `disabled`: a disabled button fires no
            // hover in most browsers, so its title would never appear — and the
            // title is the whole point of keeping the chip visible.
            aria-disabled={inert || undefined}
            onClick={() => {
              if (inert) return
              onVividnessChange(vividness === "bold" ? "natural" : "bold")
            }}
            className={cn(
              "bg-ink/[0.06] text-ash inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase transition-colors",
              inert ? "cursor-not-allowed opacity-45" : "hover:bg-ink/10 hover:text-ink",
            )}
            title={
              inert
                ? locked
                  ? "Your accents are set by hand, so they already carry their own saturation."
                  : !showAccent2
                    ? "Lite scope has no accent ramps to saturate."
                    : "This brand is already saturated enough that a floor has nothing to lift. Try it on a muted brand."
                : vividness === "bold"
                  ? "Bold — derived accents get a saturation floor. Click for natural."
                  : "Natural — derived accents inherit the brand's saturation. Click for bold."
            }
          >
            {vividness}
            {/*
              Only when inert, because that is the only time the chip's own
              label fails to explain it: "natural" sitting there unchanged after
              a click looks like nothing happened, and there is no way to guess
              that the reason lives in a title attribute. Marks that there is
              something to read rather than restating it — the tooltip is
              already carrying the sentence.
            */}
            {inert && <WarningCircle size={10} weight="bold" aria-hidden="true" />}
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
    // The dimming sits on the two children rather than on this row. `opacity`
    // below 1 creates a stacking context, and with it here the swatch popover's
    // z-30 was trapped inside a box the derivation dropdown paints over — the
    // picker opened *underneath* the controls below it. Only the derived
    // accents are muted, which is why it looked like an accent-only bug. Same
    // trap SchemeSelect documents; the fix is the same one.
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <SwatchPicker
        muted={muted}
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
          muted && "opacity-70",
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
function SwatchPicker({
  color,
  onChange,
  muted = false,
}: {
  color: string
  onChange: (hex: string) => void
  /** Dims the trigger only. Never put this on the wrapper — see HexField. */
  muted?: boolean
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
        className={cn(
          "ring-ink/15 block h-9 w-9 rounded-md ring-1 transition-transform ring-inset hover:scale-[1.04]",
          muted && "opacity-70",
        )}
        style={{ backgroundColor: color }}
      />
      <AnimatePresence>
        {open && (
          <motion.div
            {...POPOVER}
            className={cn(
              "ramp-picker border-line bg-paper absolute top-full left-0 z-30 mt-2 rounded-lg border p-2.5 shadow-xl",
              POPOVER_ORIGIN,
            )}
          >
            <HexColorPicker color={color} onChange={onChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
