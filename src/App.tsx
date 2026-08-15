// ==============================================
// APP
// Ramps-specific wiring. Holds the five inputs
// everything else derives from — brand color,
// optional accent override, scope, derivation scheme,
// and WCAG level — keeps the URL and document title in
// sync with them, and hands the page layout to
// ToolShell.
//
// Everything generic (the shell, the utility buttons,
// the modal, labels, segmented controls) lives in
// src/shared and is identical in every tool. What is
// left here is either color math or the controls that
// drive it.
// ==============================================
import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { BrandField, AccentField } from "./components/ColorInput"
import RampGroup from "./components/RampGroup"
import SemanticTokens from "./components/SemanticTokens"
import ExportPanel from "./components/ExportPanel"
import SchemeSelect from "./components/SchemeSelect"
import {
  buildPalette,
  deriveAccentHex,
  deriveAccent2Hex,
  type Vividness,
  type DsMode,
  type Scheme,
  type Palette,
} from "./lib/recommend"
import {
  readInitialShareState,
  encodeShareState,
  shareUrl,
  DEFAULT_STATE,
  type ShareState,
} from "./lib/share"
import { toCss, toJson, type Compliance, type ExportOptions } from "./lib/semantics"
import { COLOR_FORMATS, type ColorFormat } from "./lib/color"
import { useCopy } from "./shared/clipboard"
import { cn } from "./shared/utils"
import { DUR, EASE_PANEL, POPOVER, POPOVER_ORIGIN } from "./shared/motion"
import { useTheme } from "./shared/theme"
import ToolShell from "./shared/components/ToolShell"
import IconButton from "./shared/components/IconButton"
import ThemeToggle from "./shared/components/ThemeToggle"
import ResetButton from "./shared/components/ResetButton"
import ShareButton from "./shared/components/ShareButton"
import ExportModal from "./shared/components/ExportModal"
import Segmented from "./shared/components/Segmented"
import { FieldLabel } from "./shared/components/Label"
import { DownloadSimple, CaretRight, CaretDown, Check } from "@phosphor-icons/react"

/** Which entry in the shared tools manifest is this repo. */
const TOOL_ID = "ramps"

/**
 * The title and description authored in index.html, so the effect below can
 * restore them when the user returns to the default palette rather than leaving
 * a stale palette-specific title in the tab.
 *
 * Stashed on `window` rather than a plain module constant: a hot reload
 * re-executes this module while a palette-specific title is already live, and a
 * bare `const = document.title` would capture *that* as the canonical value.
 */
const CANONICAL = (() => {
  const w = window as typeof window & {
    __rampCanonicalHead?: { title: string; description: string }
  }
  w.__rampCanonicalHead ??= {
    title: document.title,
    description:
      document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
  }
  return w.__rampCanonicalHead
})()

export default function App() {
  // Hydrate initial state from a shared link, if present.
  const initial = readInitialShareState()
  const [brand, setBrand] = useState(initial.brand ?? DEFAULT_STATE.brand)
  const [accentOverride, setAccentOverride] = useState<string | null>(
    initial.accentOverride ?? DEFAULT_STATE.accentOverride,
  )
  const [accent2Override, setAccent2Override] = useState<string | null>(
    initial.accent2Override ?? DEFAULT_STATE.accent2Override,
  )
  const [mode, setMode] = useState<DsMode>(initial.mode ?? DEFAULT_STATE.mode)
  const [scheme, setScheme] = useState<Scheme>(initial.scheme ?? DEFAULT_STATE.scheme)
  const [compliance, setCompliance] = useState<Compliance>(
    initial.compliance ?? DEFAULT_STATE.compliance,
  )
  const [format, setFormat] = useState<ColorFormat>(initial.format ?? DEFAULT_STATE.format)
  const [vividness, setVividness] = useState<Vividness>(
    initial.vividness ?? DEFAULT_STATE.vividness,
  )
  // Deselected rows. Kept as Sets for cheap lookups while rendering ~45 rows;
  // serialized to sorted arrays for the URL so the link is stable.
  const [excludedRamps, setExcludedRamps] = useState<Set<string>>(
    () => new Set(initial.excludedRamps ?? DEFAULT_STATE.excludedRamps),
  )
  const [excludedTokens, setExcludedTokens] = useState<Set<string>>(
    () => new Set(initial.excludedTokens ?? DEFAULT_STATE.excludedTokens),
  )
  const [exportOpen, setExportOpen] = useState(false)
  const { theme, toggle: toggleTheme } = useTheme()

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  }

  const shareState: ShareState = {
    brand,
    accentOverride,
    accent2Override,
    mode,
    scheme,
    compliance,
    format,
    vividness,
    excludedRamps: [...excludedRamps],
    excludedTokens: [...excludedTokens],
  }

  const exportOptions: ExportOptions = {
    mode,
    compliance,
    format,
    excludedRamps,
    excludedTokens,
  }

  /**
   * Back to the bare URL. Everything the visitor chose is derived from the five
   * inputs plus the two exclusion sets, so clearing those is the whole reset —
   * the URL effect then strips the query string on its own. Theme is left alone;
   * it's a viewing preference, not part of the palette.
   */
  /** Drive every input from one state object — used by both reset and undo. */
  const applyState = (next: ShareState) => {
    setBrand(next.brand)
    setAccentOverride(next.accentOverride)
    setAccent2Override(next.accent2Override)
    setMode(next.mode)
    setScheme(next.scheme)
    setCompliance(next.compliance)
    setVividness(next.vividness)
    setFormat(next.format)
    setExcludedRamps(new Set(next.excludedRamps))
    setExcludedTokens(new Set(next.excludedTokens))
  }

  // What reset threw away, kept just long enough to offer it back.
  const undoSnapshot = useRef<ShareState | null>(null)

  const reset = () => {
    undoSnapshot.current = shareState
    applyState(DEFAULT_STATE)
  }

  const undoReset = () => {
    if (undoSnapshot.current) applyState(undoSnapshot.current)
    undoSnapshot.current = null
  }

  const accentLocked = accentOverride !== null || accent2Override !== null
  const autoAccent = useMemo(
    () => deriveAccentHex(brand, scheme, vividness),
    [brand, scheme, vividness],
  )
  const autoAccent2 = useMemo(
    () => deriveAccent2Hex(brand, scheme, vividness),
    [brand, scheme, vividness],
  )
  const palette = useMemo(
    () => buildPalette(brand, accentOverride, mode, scheme, accent2Override, vividness),
    [brand, accentOverride, mode, scheme, accent2Override, vividness],
  )

  // True while the visitor is still looking at the untouched default palette.
  // Used to keep the bare landing page clean: no query string in the address
  // bar and no palette-specific <title>, so that's what crawlers index.
  const isDefault =
    brand === DEFAULT_STATE.brand &&
    accentOverride === DEFAULT_STATE.accentOverride &&
    accent2Override === DEFAULT_STATE.accent2Override &&
    mode === DEFAULT_STATE.mode &&
    scheme === DEFAULT_STATE.scheme &&
    compliance === DEFAULT_STATE.compliance &&
    format === DEFAULT_STATE.format &&
    vividness === DEFAULT_STATE.vividness &&
    excludedRamps.size === 0 &&
    excludedTokens.size === 0

  // Keep the address bar in sync so a copy/paste of the URL also reproduces state.
  useEffect(() => {
    try {
      window.history.replaceState(
        null,
        "",
        isDefault ? "/" : `?${encodeShareState(shareState)}`,
      )
    } catch {
      // Ignore — some browsers disallow history writes in restricted contexts.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shareState is rebuilt each render
  }, [
    brand,
    accentOverride,
    mode,
    scheme,
    compliance,
    format,
    vividness,
    excludedRamps,
    excludedTokens,
    isDefault,
  ])

  // Keep document title + description in sync so agents (and link unfurlers)
  // that read the rendered head see what this specific palette is. On the
  // default palette we leave index.html's canonical copy in place — that's the
  // version search engines should index for the site itself.
  useEffect(() => {
    if (isDefault) {
      document.title = CANONICAL.title
      setMeta("name", "description", CANONICAL.description)
      return
    }
    document.title = `Ramps · ${brand} · ${scheme} · ${mode} · ${compliance}`
    setMeta("name", "description", describePalette(shareState))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shareState is rebuilt each render
  }, [
    brand,
    accentOverride,
    mode,
    scheme,
    compliance,
    vividness,
    excludedRamps,
    excludedTokens,
    isDefault,
  ])

  return (
    <ToolShell
      toolId={TOOL_ID}
      title="Color Ramp Generator"
      subtitle="Contrast-checked color ramps and semantic tokens, built to start a project and hand to your agent."
      actions={
        <>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <ResetButton onReset={reset} onUndo={undoReset} />
          <ShareButton
            url={shareUrl(shareState)}
            title="Copy a shareable link to this palette"
          />
          <IconButton onClick={() => setExportOpen(true)} title="Export tokens" variant="solid">
            <DownloadSimple size={18} weight="regular" aria-hidden="true" />
          </IconButton>
        </>
      }
      overlay={
        exportOpen && (
          <ExportModal key="export" onClose={() => setExportOpen(false)}>
            <ExportPanel
              palette={palette}
              options={exportOptions}
              shareHref={shareUrl(shareState)}
            />
          </ExportModal>
        )
      }
      controls={
        <div className="flex flex-wrap items-end gap-x-8 gap-y-6">
          <BrandField brand={brand} format={format} onBrandChange={setBrand} />

          {/*
              Accent and Derivation are coupled: while the accent is on Auto,
              Derivation is what produces it. They share a wrapper so they wrap
              together, with a rule drawn between them to show the link. On
              Manual the rule disappears and Derivation dims — it still shapes
              accent-2, the neutral tint and status vividness, so it stays
              selectable rather than being disabled outright.
            */}
          <div className="flex min-w-[300px] flex-[2] flex-col gap-4 sm:flex-row sm:items-end sm:gap-0">
            <AccentField
              accentOverride={accentOverride}
              accent2Override={accent2Override}
              autoAccent={autoAccent}
              autoAccent2={autoAccent2}
              showAccent2={mode === "full"}
              format={format}
              vividness={vividness}
              onVividnessChange={setVividness}
              onAccentChange={setAccentOverride}
              onAccent2Change={setAccent2Override}
            />
            <div
              aria-hidden="true"
              className={cn(
                "mb-[17px] hidden h-px w-8 shrink-0 transition-colors sm:block",
                accentLocked ? "bg-transparent" : "bg-line",
              )}
            />
            <div className="w-full sm:w-[196px] sm:shrink-0">
              <FieldLabel>Derivation</FieldLabel>
              <div
                title={
                  accentLocked
                    ? "The accent is set manually, so derivation no longer produces it — it still shapes accent-2, the neutral tint and status colors."
                    : undefined
                }
              >
                <SchemeSelect
                  manual={accentLocked}
                  scheme={scheme}
                  onChange={(next) => {
                    setScheme(next)
                    // Picking a derivation is a request for it to drive the
                    // accents, so pinned accents hand control back.
                    setAccentOverride(null)
                    setAccent2Override(null)
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <FieldLabel>Format</FieldLabel>
            <FormatSelect format={format} onChange={setFormat} />
          </div>

          <div>
            <FieldLabel>Contrast</FieldLabel>
            <Segmented
              ariaLabel="Contrast target"
              layoutId="compliance-pill"
              value={compliance}
              onChange={setCompliance}
              options={COMPLIANCE_OPTIONS}
            />
          </div>

          <div>
            <FieldLabel>Scope</FieldLabel>
            <Segmented
              ariaLabel="Token scope"
              layoutId="mode-pill"
              value={mode}
              onChange={setMode}
              options={SCOPE_OPTIONS}
            />
          </div>
        </div>
      }
    >
      {/*
        Ramp groups fade and collapse rather than vanishing.

        Lite scope drops the accent ramps entirely, so flipping the toggle used
        to delete a whole section from under the pointer and snap everything
        below it upward. The filter is what makes that animatable: RampGroup
        returns null when it has no ramps, and a child rendering null is still
        "present" to AnimatePresence — so the group has to leave the array for
        an exit to run at all.
      */}
      <AnimatePresence initial={false}>
        {(
          [
            ["Brand", palette.primaries],
            ["Accents", palette.accents],
            ["Neutral", [palette.neutral]],
            ["Status", palette.status],
          ] as const
        )
          .filter(([, ramps]) => ramps.length > 0)
          .map(([title, ramps]) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: DUR.panel, ease: EASE_PANEL }}
              // Clips the collapse, and stops the section's own mb-12 from
              // collapsing through the animating box.
              className="overflow-hidden"
            >
              <RampGroup
                key={title}
                title={title}
                ramps={ramps}
                format={format}
                excluded={excludedRamps}
                onToggle={(name) => setExcludedRamps((prev) => toggle(prev, name))}
                onSetMany={(names, off) =>
                  setExcludedRamps((prev) => {
                    const next = new Set(prev)
                    names.forEach((n) => (off ? next.add(n) : next.delete(n)))
                    return next
                  })
                }
              />
            </motion.div>
          ))}
      </AnimatePresence>
      <SemanticTokens
        palette={palette}
        mode={mode}
        compliance={compliance}
        format={format}
        excludedRamps={excludedRamps}
        excluded={excludedTokens}
        onToggle={(name) => setExcludedTokens((prev) => toggle(prev, name))}
        onSetMany={(names, off) =>
          setExcludedTokens((prev) => {
            const next = new Set(prev)
            names.forEach((n) => (off ? next.add(n) : next.delete(n)))
            return next
          })
        }
      />
      <AgentData palette={palette} options={exportOptions} state={shareState} />
    </ToolShell>
  )
}

/**
 * WCAG contrast target. Changing it re-resolves every semantic token: paired
 * foregrounds walk their ramp until they clear the ratio, and action fills move
 * too when a foreground runs out of ramp. See `resolveTokens` in lib/semantics.
 */
const COMPLIANCE_OPTIONS = [
  { id: "AA" as const, label: "AA", title: "WCAG AA — 4.5:1 minimum for normal text" },
  { id: "AAA" as const, label: "AAA", title: "WCAG AAA — 7:1 minimum for normal text" },
]

const SCOPE_OPTIONS = [
  {
    id: "full" as const,
    label: "Full",
    title: "Every token, including hover and active states",
  },
  { id: "basic" as const, label: "Lite", title: "Core tokens only" },
]

/** Upsert a <meta> tag by attribute so runtime updates stay in sync. */
function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute("content", content)
}

/** A one-line, agent-friendly summary of the current palette. */
function describePalette(s: ShareState): string {
  const accent = s.accentOverride ? `accent ${s.accentOverride}` : "auto-derived accent"
  return `Design-system palette generated from brand color ${s.brand} (${accent}), ${s.scheme} derivation, ${s.mode} scope, tuned to WCAG ${s.compliance} contrast. Perceptually-even OKLCH ramps plus usage-first semantic tokens for light and dark. Full token values are listed on the page.`
}

const AGENT_FORMATS = [
  { id: "json" as const, label: "JSON" },
  { id: "css" as const, label: "CSS" },
]

/**
 * A visible-but-collapsed, plain-text dump of the entire palette so agents that
 * read the rendered DOM get every ramp step and semantic token (light + dark)
 * without hovering or interacting. Reuses the CSS exporter as the canonical form.
 */
function AgentData({
  palette,
  options,
  state,
}: {
  palette: Palette
  options: ExportOptions
  state: ShareState
}) {
  const { compliance } = state
  // Collapsed by default: this block is for agents, and a wall of CSS above the
  // fold is not what a person came here for.
  const [agentOpen, setAgentOpen] = useState(false)
  const omitted = state.excludedRamps.length + state.excludedTokens.length
  const legend = [
    "# Ramps Studio — machine-readable palette",
    "# Deterministically derived from the URL query string:",
    "#   b = brand hex (no #)   a / a2 = accent hexes (optional, omit for auto)",
    "#   m = scope: full | basic",
    "#   s = derivation: complementary | analogous | triadic | split | monochromatic",
    "#   c = contrast target: AA (4.5:1) | AAA (7:1)",
    "#   f = notation: oklch | hex | rgb | hsl",
    "#   v = derived accent saturation: natural | bold",
    "#   xr / xt = dot-separated ramp / token names the author deselected",
    // Mirrors encodeShareState: the optional params appear only when they are
    // actually set, so this line stays a copy-pasteable reproduction of exactly
    // what is rendered below — including a pinned tertiary accent and a
    // non-default notation, both of which used to be silently dropped.
    `# This palette: b=${state.brand.replace("#", "")}` +
      `${state.accentOverride ? ` a=${state.accentOverride.replace("#", "")}` : ""}` +
      `${state.accent2Override ? ` a2=${state.accent2Override.replace("#", "")}` : ""}` +
      ` m=${state.mode} s=${state.scheme} c=${state.compliance}` +
      `${state.format !== DEFAULT_STATE.format ? ` f=${state.format}` : ""}` +
      `${state.vividness !== DEFAULT_STATE.vividness ? ` v=${state.vividness}` : ""}`,
    "# Ramps are 50–950 OKLCH steps; semantic tokens are listed for :root (light) and .dark.",
    `# Token steps are auto-adjusted so paired foregrounds meet WCAG ${state.compliance}.`,
    ...(omitted
      ? [
          `# ${omitted} row(s) were deselected by the author and are omitted below;`,
          "# treat what follows as the complete intended palette.",
        ]
      : []),
  ].join("\n")

  const [format, setFormat] = useState<"css" | "json">("json")
  const { copied, copy } = useCopy(1400)
  const code = format === "css" ? toCss(palette, options) : toJson(palette, options)

  return (
    <section className="mb-12 print:hidden" aria-label="Machine-readable palette for agents">
      {/*
        A button plus AnimatePresence rather than <details>.

        Native <details> cannot be animated: the content is display:none when
        closed, so there is nothing to transition from and it pops open. The
        caret rotated, which only drew attention to the fact that nothing else
        did.

        Losing <details> costs nothing an agent relies on. This block is the
        HUMAN copy — an agent fetching this URL reads a separate payload that
        api/render injects into the HTML, so collapsing this one has never been
        what keeps the palette machine-readable. Verified against production
        before changing it, rather than assumed.

        aria-expanded and aria-controls replace the semantics <summary> gave
        for free.
      */}
      <div className="border-line rounded-lg border">
        <button
          type="button"
          onClick={() => setAgentOpen((v) => !v)}
          aria-expanded={agentOpen}
          aria-controls="agent-palette"
          className="text-ash hover:text-ink w-full cursor-pointer px-4 py-3 text-left font-mono text-xs transition-colors"
        >
          <span className="inline-flex items-center gap-1.5">
            <CaretRight
              size={12}
              weight="bold"
              aria-hidden="true"
              className={cn("transition-transform duration-200", agentOpen && "rotate-90")}
            />
            Machine-readable palette (for agents)
          </span>
        </button>
        <AnimatePresence initial={false}>
          {agentOpen && (
            <motion.div
              id="agent-palette"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: DUR.panel, ease: EASE_PANEL }}
              // Height animation only works on a box that clips: without this
              // the content spills past the collapsing container mid-flight.
              className="overflow-hidden"
            >
              <div className="border-line border-t">
                {/* Legend stays outside the copyable block so the copied code is valid. */}
                <pre className="text-ash px-4 pt-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {legend}
                </pre>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <Segmented
                    ariaLabel="Machine-readable format"
                    layoutId="agent-format-pill"
                    size="sm"
                    value={format}
                    onChange={setFormat}
                    options={AGENT_FORMATS}
                  />
                  <button
                    type="button"
                    onClick={() => copy(code)}
                    className="border-ink/20 text-ink hover:bg-ink/[0.04] inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[11px] transition-colors"
                  >
                    {copied ? "Copied" : `Copy ${format.toUpperCase()}`}
                  </button>
                </div>
                <pre className="border-line text-ink overflow-x-auto border-t px-4 py-3 font-mono text-[11px] leading-relaxed">
                  {code}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

/**
 * Notation for every colour the app shows or exports. OKLCH is the form the
 * ramps are actually built in, so exporting it preserves the wide-gamut intent
 * that hex quietly discards.
 */
function FormatSelect({
  format,
  onChange,
}: {
  format: ColorFormat
  onChange: (f: ColorFormat) => void
}) {
  // A custom popover rather than a native <select>, matching SchemeSelect
  // directly beside it. The native control was the odd one out in this row: an
  // OS menu in the app's own chrome, unstyleable, and the only dropdown here
  // that could not animate. Dismissal, keyboard handling and the caret rotation
  // are deliberately identical to SchemeSelect — two dropdowns sitting inches
  // apart should not behave like different components.
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = COLOR_FORMATS.find((f) => f.id === format) ?? COLOR_FORMATS[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Color notation"
        className="border-line bg-paper text-ink hover:border-ink/30 focus-visible:ring-ink/30 flex h-9 w-full items-center justify-between gap-2 rounded-md border pr-2.5 pl-3 font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {current.label}
        <CaretDown
          size={12}
          weight="bold"
          aria-hidden="true"
          className={cn("text-ash shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            {...POPOVER}
            className={cn(
              "border-line bg-paper absolute top-full right-0 left-0 z-20 mt-1.5 min-w-max overflow-hidden rounded-md border shadow-lg",
              POPOVER_ORIGIN,
            )}
          >
            {COLOR_FORMATS.map((f) => {
              const selected = f.id === format
              return (
                <button
                  key={f.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(f.id)
                    setOpen(false)
                  }}
                  className="hover:bg-ink/[0.04] flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-mono text-xs transition-colors"
                >
                  <span className={selected ? "text-ink" : "text-ash"}>{f.label}</span>
                  {selected && (
                    <Check size={12} weight="bold" aria-hidden="true" className="text-ink" />
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
