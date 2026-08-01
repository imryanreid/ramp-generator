// ==============================================
// SEMANTIC TOKENS
// The token table: each usage-first token name, the
// ramp step it resolves to, and side-by-side light
// and dark previews. Values can be shown as raw hex
// or as the ramp alias they point at.
// ==============================================
import { useState } from "react"
import { motion } from "motion/react"
import {
  resolveTokens,
  rampAliasNames,
  CONTRAST_TARGET,
  type ResolvedToken,
  type DsMode,
  type Compliance,
} from "../lib/semantics"
import type { Palette } from "../lib/recommend"
import { cn } from "../lib/utils"
import CopyButton from "./CopyButton"
import RowToggle from "./RowToggle"
import { Square, TextT, Selection, Target } from "@phosphor-icons/react"

type ValueView = "hex" | "ramp"

export default function SemanticTokens({
  palette,
  mode,
  compliance,
  excluded,
  onToggle,
  onSetMany,
}: {
  palette: Palette
  mode: DsMode
  compliance: Compliance
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
        <ViewToggle view={view} onChange={setView} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-left font-mono text-[11px] uppercase tracking-wide text-ash">
              <th className="py-2 pr-4 font-medium">Token</th>
              <th className="py-2 pr-4 font-medium">Role</th>
              <th className="py-2 pr-4 font-medium">Light</th>
              <th className="py-2 pr-4 font-medium">Dark</th>
              <th className="py-2 pr-4 font-medium">{compliance}</th>
              <th className="py-2 text-right font-medium">Export</th>
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

/** Segmented control switching the Light/Dark columns between hex and ramp refs. */
function ViewToggle({ view, onChange }: { view: ValueView; onChange: (v: ValueView) => void }) {
  const options: { id: ValueView; label: string }[] = [
    { id: "hex", label: "Hex" },
    { id: "ramp", label: "Ramp" },
  ]
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-paper p-0.5">
      {options.map((o) => {
        const active = view === o.id
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "relative rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors",
              active ? "text-ink" : "text-ash hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="sem-view-pill"
                className="absolute inset-0 rounded-full bg-ink/[0.08]"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function GroupBlock({
  category,
  rows,
  view,
  rampNames,
  target,
  excluded,
  onToggle,
  onSetMany,
}: {
  category: string
  rows: ResolvedToken[]
  view: ValueView
  rampNames: Record<string, string>
  target: number
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
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
            <CategoryIcon category={category} />
            {category}
          </span>
        </td>
        <td className="pt-7 pb-1.5 text-right">
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
  included,
  onToggle,
}: {
  t: ResolvedToken
  view: ValueView
  rampNames: Record<string, string>
  target: number
  included: boolean
  onToggle: () => void
}) {
  const lightLabel = view === "ramp" ? rampRef(rampNames, t.light.ramp, t.light.step) : t.lightHex
  const darkLabel = view === "ramp" ? rampRef(rampNames, t.dark.ramp, t.dark.step) : t.darkHex
  return (
    <tr className="border-t border-line-soft">
      {/* Only the content dims — the checkbox stays at full strength so an
          excluded row is still obviously re-includable. */}
      <td className={cn("py-2 pr-4 transition-opacity", !included && "opacity-40")}>
        <CopyCell value={t.token}>
          <span className="inline-flex items-center gap-2 font-mono text-[13px]">
            <CategoryIcon category={t.category} />
            {t.token}
          </span>
        </CopyCell>
      </td>
      <td className={cn("py-2 pr-4 text-ash transition-opacity", !included && "opacity-40")}>
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
      <td className="py-2 text-right">
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
      className="inline-flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-2.5"
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
      <span className="font-mono text-xs uppercase">{label}</span>
    </span>
  )
}

function AA({ light, dark, target }: { light?: number; dark?: number; target: number }) {
  if (light === undefined && dark === undefined) {
    return <span className="font-mono text-[11px] text-line">—</span>
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
