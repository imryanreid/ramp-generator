// ==============================================
// SEMANTIC TOKENS
// The token table: each usage-first token name, the
// ramp step it resolves to, and side-by-side light
// and dark previews. Values can be shown as raw hex
// or as the ramp alias they point at.
// ==============================================
import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  resolveTokens,
  rampAliasNames,
  CONTRAST_TARGET,
  type ResolvedToken,
  type DsMode,
  type Compliance,
} from "../lib/semantics"
import type { Palette } from "../lib/recommend"
import { formatColor, type ColorFormat } from "../lib/color"
import { cn } from "../shared/utils"
import { DUR } from "../shared/motion"
import Segmented from "../shared/components/Segmented"
import CopyButton from "../shared/components/CopyButton"
import RowToggle from "../shared/components/RowToggle"
import { Square, TextT, Selection, Target, Warning } from "@phosphor-icons/react"

type ValueView = "hex" | "ramp"

export default function SemanticTokens({
  palette,
  mode,
  compliance,
  format,
  excludedRamps,
  excluded,
  onToggle,
  onSetMany,
}: {
  palette: Palette
  mode: DsMode
  compliance: Compliance
  format: ColorFormat
  /** Ramps deselected for export — their tokens can no longer show a ramp alias. */
  excludedRamps: ReadonlySet<string>
  excluded: ReadonlySet<string>
  onToggle: (name: string) => void
  onSetMany: (names: string[], off: boolean) => void
}) {
  const tokens = resolveTokens(palette, mode, compliance)
  const target = CONTRAST_TARGET[compliance]
  const rampNames = rampAliasNames(palette)
  const [view, setView] = useState<ValueView>("hex")

  // Preserve declaration order while grouping by category.
  const groups: { category: string; rows: ResolvedToken[] }[] = []
  for (const tok of tokens) {
    let g = groups.find((x) => x.category === tok.category)
    if (!g) {
      g = { category: tok.category, rows: [] }
      groups.push(g)
    }
    g.rows.push(tok)
  }

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold tracking-tight">Semantic tokens</h2>
        <Segmented
          ariaLabel="Token value display"
          layoutId="sem-view-pill"
          size="sm"
          uppercase
          value={view}
          onChange={setView}
          options={VIEW_OPTIONS}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-ash text-left font-mono text-[11px] tracking-wide uppercase">
              <th className="py-2 pr-4 font-medium">Token</th>
              <th className="py-2 pr-4 font-medium">Example</th>
              <th className="py-2 pr-4 font-medium">Light</th>
              <th className="py-2 pr-4 font-medium">Dark</th>
              <th className="py-2 pr-4 font-medium">{compliance}</th>
              <th className="py-2 text-right font-medium print:hidden">Export</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <GroupBlock
                key={g.category}
                category={g.category}
                rows={g.rows}
                view={view}
                rampNames={rampNames}
                target={target}
                format={format}
                excludedRamps={excludedRamps}
                excluded={excluded}
                onToggle={onToggle}
                onSetMany={onSetMany}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// "Raw" rather than "Hex": the id stays `hex`, but the label was wrong as often
// as it was right — the column shows whatever notation the Format control is
// set to, so it reads `oklch(...)` or `rgb(...)` just as readily. "Raw" names
// what the toggle actually does, which is show the value itself rather than the
// ramp step it came from.
const VIEW_OPTIONS = [
  { id: "hex" as const, label: "Raw", title: "Show the resolved color value" },
  { id: "ramp" as const, label: "Ramp", title: "Show which ramp step each token points at" },
]

function GroupBlock({
  category,
  rows,
  view,
  rampNames,
  target,
  format,
  excludedRamps,
  excluded,
  onToggle,
  onSetMany,
}: {
  category: string
  rows: ResolvedToken[]
  view: ValueView
  rampNames: Record<string, string>
  target: number
  format: ColorFormat
  excludedRamps: ReadonlySet<string>
  excluded: ReadonlySet<string>
  onToggle: (name: string) => void
  onSetMany: (names: string[], off: boolean) => void
}) {
  const names = rows.map((r) => r.token)
  const on = names.filter((n) => !excluded.has(n)).length
  return (
    <>
      <tr>
        <td colSpan={5} className="pt-7 pb-1.5">
          <span className="text-ink inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase">
            <CategoryIcon category={category} />
            {category}
          </span>
        </td>
        <td className="pt-7 pb-1.5 text-right print:hidden">
          <RowToggle
            checked={on === names.length}
            indeterminate={on > 0 && on < names.length}
            onChange={() => onSetMany(names, on === names.length)}
            label={`${on === names.length ? "Exclude" : "Include"} every ${category} token`}
          />
        </td>
      </tr>
      {rows.map((t) => (
        <Row
          key={t.token}
          t={t}
          view={view}
          rampNames={rampNames}
          target={target}
          format={format}
          excludedRamps={excludedRamps}
          included={!excluded.has(t.token)}
          onToggle={() => onToggle(t.token)}
        />
      ))}
    </>
  )
}

/** Ramp reference label for a token location, e.g. "Blue 600". */
function rampRef(rampNames: Record<string, string>, ramp: string, step: number): string {
  return `${rampNames[ramp] ?? ramp} ${step}`
}

function Row({
  t,
  view,
  rampNames,
  target,
  format,
  excludedRamps,
  included,
  onToggle,
}: {
  t: ResolvedToken
  view: ValueView
  rampNames: Record<string, string>
  target: number
  format: ColorFormat
  excludedRamps: ReadonlySet<string>
  included: boolean
  onToggle: () => void
}) {
  // A ramp alias only means something if that ramp is actually exported. When
  // it isn't the exporters inline the literal colour, so the table shows the
  // literal too rather than pointing at a scale the consumer won't receive.
  const label = (loc: { ramp: string; step: number }, hex: string) =>
    view === "ramp" && !excludedRamps.has(loc.ramp)
      ? rampRef(rampNames, loc.ramp, loc.step)
      : formatColor(hex, format)
  const lightLabel = label(t.light, t.lightHex)
  const darkLabel = label(t.dark, t.darkHex)
  return (
    <tr className="border-line-soft border-t">
      {/* Only the content dims — the checkbox stays at full strength so an
          excluded row is still obviously re-includable. */}
      <td className={cn("py-2 pr-4 transition-opacity", !included && "opacity-40")}>
        <CopyCell value={t.token}>
          <span className="inline-flex items-center gap-2 font-mono text-[13px]">
            {t.warnings?.length ? (
              <CollisionWarning token={t} />
            ) : (
              <CategoryIcon category={t.category} />
            )}
            {t.token}
          </span>
        </CopyCell>
      </td>
      <td className={cn("text-ash py-2 pr-4 transition-opacity", !included && "opacity-40")}>
        {t.role}
      </td>
      <td className={cn("py-2 pr-4 transition-opacity", !included && "opacity-40")}>
        <CopyCell value={lightLabel}>
          <Chip hex={t.lightHex} label={lightLabel} mode="light" />
        </CopyCell>
      </td>
      <td className={cn("py-2 pr-4 transition-opacity", !included && "opacity-40")}>
        <CopyCell value={darkLabel}>
          <Chip hex={t.darkHex} label={darkLabel} mode="dark" />
        </CopyCell>
      </td>
      <td className={cn("py-2 pr-4 transition-opacity", !included && "opacity-40")}>
        <AA light={t.lightRatio} dark={t.darkRatio} target={target} />
      </td>
      <td className="py-2 text-right print:hidden">
        <RowToggle
          checked={included}
          onChange={onToggle}
          label={`${included ? "Exclude" : "Include"} ${t.token} in exports`}
        />
      </td>
    </tr>
  )
}

/** A table cell's content with a copy button that reveals on hover. */
function CopyCell({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <span className="group/cell inline-flex items-center gap-1.5">
      {children}
      <CopyButton
        value={value}
        className="opacity-0 transition-opacity group-hover/cell:opacity-100 focus-visible:opacity-100"
      />
    </span>
  )
}

/** Small usage glyph per token category. */
/** A small glyph per token category, so the table scans by shape as well as text. */
function CategoryIcon({ category }: { category: string }) {
  const common = { size: 14, "aria-hidden": true, className: "shrink-0 text-ash" } as const
  switch (category) {
    case "Background":
      return <Square {...common} weight="fill" />
    case "Text":
      return <TextT {...common} weight="bold" />
    case "Border":
      return <Selection {...common} weight="bold" />
    case "Focus":
      return <Target {...common} weight="regular" />
    default:
      return null
  }
}

/**
 * A hex value shown inside its intended context: the Light column always renders
 * on a light surface and the Dark column on a dark one, so the token's real
 * contrast is legible regardless of the page theme.
 */
function Chip({ hex, label, mode }: { hex: string; label: string; mode: "light" | "dark" }) {
  const dark = mode === "dark"
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border py-1 pr-2.5 pl-1.5"
      style={{
        backgroundColor: dark ? "#141310" : "#ffffff",
        color: dark ? "#f3f2ec" : "#16150f",
        borderColor: dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)",
      }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full"
        style={{
          backgroundColor: hex,
          boxShadow: dark
            ? "inset 0 0 0 1px rgba(255,255,255,0.22)"
            : "inset 0 0 0 1px rgba(0,0,0,0.12)",
        }}
      />
      {/*
        Crossfade the label, keyed on its own text.

        Only this span changes when Raw/Ramp is flipped — the token name, the
        role and the swatch all stay put — so the fade is scoped to the thing
        that actually swaps rather than dimming whole rows that are not moving.
        `mode="popLayout"` keeps the outgoing copy out of flow, so the chip does
        not widen for a frame while both strings are mounted.
      */}
      {/* Uppercase suits a bare hex; it would mangle `oklch(...)`. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.swap, ease: "easeOut" }}
          className={cn("font-mono text-xs", label.startsWith("#") && "uppercase")}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function AA({ light, dark, target }: { light?: number; dark?: number; target: number }) {
  if (light === undefined && dark === undefined) {
    return <span className="text-line font-mono text-[11px]">—</span>
  }
  const badge = (ratio?: number, label?: string) => {
    if (ratio === undefined) return null
    const pass = ratio >= target
    return (
      <span
        title={`${label}: ${ratio.toFixed(2)}:1 (needs ${target}:1)`}
        className={cn(
          "rounded px-1 py-px font-mono text-[10px]",
          pass ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
        )}
      >
        {label} {ratio.toFixed(1)}
      </span>
    )
  }
  return (
    <div className="flex gap-1">
      {badge(light, "L")}
      {badge(dark, "D")}
    </div>
  )
}

/**
 * Flags a token that shares its value with a sibling it ought to differ from,
 * standing in for the category chip so the row doesn't get busier.
 *
 * Both causes are constraints rather than bugs — an achromatic brand, or AAA
 * squeezing a three-level text hierarchy into the few steps that clear 7:1 —
 * so the copy explains the situation rather than implying something is broken.
 */
function CollisionWarning({ token }: { token: ResolvedToken }) {
  if (!token.warnings?.length) return null
  // List the clashes per mode, then give the reason once — it's the same
  // constraint in both, and repeating it doubles the tooltip for no gain.
  const where = token.warnings.map((w) => `${w.sameAs.join(", ")} in ${w.mode}`).join("; ")
  const summary = `Same value as ${where}. ${token.warnings[0].reason}`

  return (
    <span className="group/warn relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={summary}
        className="inline-flex cursor-help text-amber-500 focus-visible:outline-none"
      >
        <Warning size={14} weight="fill" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className="bg-ink text-paper pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-64 rounded-md px-3 py-2 text-left font-sans text-[11px] leading-relaxed opacity-0 shadow-lg transition-opacity duration-150 group-focus-within/warn:opacity-100 group-hover/warn:opacity-100"
      >
        {summary}
      </span>
    </span>
  )
}
