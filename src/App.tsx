// ==============================================
// APP
// The whole page. Holds the five inputs everything
// else is derived from — brand color, optional
// accent override, scope, derivation scheme, and
// WCAG level — and keeps the URL and document title
// in sync with them. Below the controls it renders the ramps,
// the semantic token table, a machine-readable dump
// of the palette for agents, and the footer.
//
// The small pieces used only here (icon buttons,
// theme toggle, share button, export modal) live at
// the bottom of this file; anything reused lives in
// components/.
// ==============================================
import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, MotionConfig } from "motion/react"
import { BrandField, AccentField } from "./components/ColorInput"
import RampGroup from "./components/RampGroup"
import SemanticTokens from "./components/SemanticTokens"
import ExportPanel from "./components/ExportPanel"
import SchemeSelect from "./components/SchemeSelect"
import {
  buildPalette,
  deriveAccentHex,
  deriveAccent2Hex,
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
import { toCss, toJson, allRamps, type Compliance, type ExportOptions } from "./lib/semantics"
import { COLOR_FORMATS, type ColorFormat } from "./lib/color"
import { useCopy } from "./lib/clipboard"
import { cn } from "./lib/utils"
import {
  DownloadSimple,
  Sun,
  Moon,
  LinkSimple,
  Check,
  X,
  CaretRight,
  CaretDown,
  ArrowCounterClockwise,
} from "@phosphor-icons/react"
import avatarUrl from "./assets/avatar-ryan.webp"
import studioLogo from "./assets/logo-tktk.webp"

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
  // Deselected rows. Kept as Sets for cheap lookups while rendering ~45 rows;
  // serialized to sorted arrays for the URL so the link is stable.
  const [excludedRamps, setExcludedRamps] = useState<Set<string>>(
    () => new Set(initial.excludedRamps ?? DEFAULT_STATE.excludedRamps),
  )
  const [excludedTokens, setExcludedTokens] = useState<Set<string>>(
    () => new Set(initial.excludedTokens ?? DEFAULT_STATE.excludedTokens),
  )
  const [exportOpen, setExportOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

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
  const autoAccent = useMemo(() => deriveAccentHex(brand, scheme), [brand, scheme])
  const autoAccent2 = useMemo(() => deriveAccent2Hex(brand, scheme), [brand, scheme])
  const palette = useMemo(
    () => buildPalette(brand, accentOverride, mode, scheme, accent2Override),
    [brand, accentOverride, mode, scheme, accent2Override],
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
    excludedRamps,
    excludedTokens,
    isDefault,
  ])

  // Apply + persist the page theme by toggling `.dark` on <html>.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    try {
      localStorage.setItem("theme", theme)
    } catch {
      // Ignore storage failures (private mode / sandbox).
    }
  }, [theme])

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
    document.title = `Color Ramp & Semantics Generator — ${brand} · ${scheme} · ${mode} · ${compliance}`
    setMeta("name", "description", describePalette(shareState))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shareState is rebuilt each render
  }, [
    brand,
    accentOverride,
    mode,
    scheme,
    compliance,
    excludedRamps,
    excludedTokens,
    isDefault,
  ])

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen">
        <AnimatePresence>
          {exportOpen && (
            <ExportModal key="export" onClose={() => setExportOpen(false)}>
              <ExportPanel
                palette={palette}
                options={exportOptions}
                shareHref={shareUrl(shareState)}
                onPrint={() => {
                  // Close first — the modal would otherwise land on page one.
                  // The delay lets the exit animation finish before printing.
                  setExportOpen(false)
                  window.setTimeout(() => window.print(), 300)
                }}
              />
            </ExportModal>
          )}
        </AnimatePresence>

        <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10 lg:py-14">
          {/* Controls — top row */}
          <section className="border-line mb-12 border-b pb-10">
            {/* Narrow screens put the action stack on its own line above the
              title, rather than squeezing the header copy into a sliver. */}
            <div className="mb-8 flex flex-col-reverse items-start gap-5 sm:flex-row sm:justify-between sm:gap-4">
              <header>
                <p className="text-ash mb-1 font-mono text-[11px] tracking-[0.2em] uppercase">
                  ramps.studio
                </p>
                <h1 className="font-display text-3xl leading-none font-semibold tracking-tight">
                  Color Ramp Generator
                </h1>
                <p className="text-ash mt-3 max-w-[52ch] text-sm leading-relaxed">
                  Generate agent-optimized, accessible color ramps in a few clicks.
                </p>
              </header>

              {/* Top-right action stack — theme, share, export (icon-only). */}
              <div className="flex items-center gap-2 print:hidden">
                <ThemeToggle
                  theme={theme}
                  onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
                />
                <ResetButton onReset={reset} onUndo={undoReset} />
                <ShareButton state={shareState} />
                <IconButton
                  onClick={() => setExportOpen(true)}
                  title="Export tokens"
                  variant="solid"
                >
                  <DownloadSimple size={18} weight="regular" aria-hidden="true" />
                </IconButton>
              </div>
            </div>

            {/* Controls — single row */}
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
                  onAccentChange={setAccentOverride}
                  onAccent2Change={setAccent2Override}
                  onReset={() => {
                    setAccentOverride(null)
                    setAccent2Override(null)
                  }}
                />
                <div
                  aria-hidden="true"
                  className={cn(
                    "mb-[17px] hidden h-px w-8 shrink-0 transition-colors sm:block",
                    accentLocked ? "bg-transparent" : "bg-line",
                  )}
                />
                <div className="w-full sm:w-[196px] sm:shrink-0">
                  <SectionLabel>Derivation</SectionLabel>
                  <div
                    className={cn("transition-opacity", accentLocked && "opacity-45")}
                    title={
                      accentLocked
                        ? "The accent is set manually, so derivation no longer produces it — it still shapes accent-2, the neutral tint and status colors."
                        : undefined
                    }
                  >
                    <SchemeSelect
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
                <SectionLabel>Format</SectionLabel>
                <FormatSelect format={format} onChange={setFormat} />
              </div>

              <div>
                <SectionLabel>Contrast</SectionLabel>
                <ComplianceToggle compliance={compliance} onChange={setCompliance} />
              </div>

              <div>
                <SectionLabel>Scope</SectionLabel>
                <ModeToggle mode={mode} onChange={setMode} />
              </div>
            </div>
          </section>

          {/* Output — new section */}
          <main className="min-w-0">
            {(
              [
                ["Brand", palette.primaries],
                ["Accents", palette.accents],
                ["Neutral", [palette.neutral]],
                ["Status", palette.status],
              ] as const
            ).map(([title, ramps]) => (
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
            ))}
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
            <Attribution />
          </main>
        </div>
      </div>
    </MotionConfig>
  )
}

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
  const omitted = state.excludedRamps.length + state.excludedTokens.length
  const legend = [
    "# Ramps Studio — machine-readable palette",
    "# Deterministically derived from the URL query string:",
    "#   b = brand hex (no #)   a / a2 = accent hexes (optional, omit for auto)",
    "#   m = scope: full | basic",
    "#   s = derivation: complementary | analogous | triadic | split | monochromatic",
    "#   c = contrast target: AA (4.5:1) | AAA (7:1)",
    "#   f = notation: oklch | hex | rgb | hsl",
    "#   xr / xt = dot-separated ramp / token names the author deselected",
    // Mirrors encodeShareState: the optional params appear only when they are
    // actually set, so this line stays a copy-pasteable reproduction of exactly
    // what is rendered below — including a pinned tertiary accent and a
    // non-default notation, both of which used to be silently dropped.
    `# This palette: b=${state.brand.replace("#", "")}` +
      `${state.accentOverride ? ` a=${state.accentOverride.replace("#", "")}` : ""}` +
      `${state.accent2Override ? ` a2=${state.accent2Override.replace("#", "")}` : ""}` +
      ` m=${state.mode} s=${state.scheme} c=${state.compliance}` +
      `${state.format !== DEFAULT_STATE.format ? ` f=${state.format}` : ""}`,
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
  const formats: { id: "css" | "json"; label: string }[] = [
    { id: "json", label: "JSON" },
    { id: "css", label: "CSS" },
  ]

  return (
    <section className="mb-12 print:hidden" aria-label="Machine-readable palette for agents">
      <details className="group border-line rounded-lg border">
        <summary className="text-ash hover:text-ink cursor-pointer list-none px-4 py-3 font-mono text-xs transition-colors">
          <span className="inline-flex items-center gap-1.5">
            <CaretRight
              size={12}
              weight="bold"
              aria-hidden="true"
              className="transition-transform duration-200 group-open:rotate-90"
            />
            Machine-readable palette (for agents)
          </span>
        </summary>
        <div className="border-line border-t">
          {/* Legend stays outside the copyable block so the copied code is valid. */}
          <pre className="text-ash px-4 pt-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
            {legend}
          </pre>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="border-line inline-flex rounded-md border p-0.5">
              {formats.map((f) => {
                const active = format === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={cn(
                      "relative rounded px-2.5 py-1 font-mono text-[11px] transition-colors",
                      active ? "text-paper" : "text-ash hover:text-ink",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="agent-format-pill"
                        className="bg-ink absolute inset-0 rounded"
                        transition={{ type: "spring", stiffness: 480, damping: 38 }}
                      />
                    )}
                    <span className="relative z-10">{f.label}</span>
                  </button>
                )
              })}
            </div>
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
      </details>
    </section>
  )
}

type Theme = "light" | "dark"

/** Initial theme: stored preference, else the OS setting, else light. */
function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem("theme")
    if (saved === "light" || saved === "dark") return saved
  } catch {
    // Ignore storage failures.
  }
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark"
  }
  return "light"
}

/** Shared icon-button chrome for the top-right action stack. */
function IconButton({
  onClick,
  title,
  variant = "outline",
  children,
}: {
  onClick: () => void
  title: string
  variant?: "outline" | "solid" | "danger"
  children: React.ReactNode
}) {
  const chrome =
    variant === "solid"
      ? "bg-ink text-paper hover:-translate-y-0.5 shadow-sm"
      : variant === "danger"
        ? // Destructive-ish: reset throws away whatever the visitor built up.
          "border border-ink/20 text-ink hover:-translate-y-0.5 hover:border-red-500 hover:text-red-500 hover:bg-red-500/[0.06]"
        : "border border-ink/20 text-ink hover:-translate-y-0.5 hover:border-ink/40 hover:bg-ink/[0.04]"
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-md transition-all",
        chrome,
      )}
    >
      {children}
    </button>
  )
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const dark = theme === "dark"
  return (
    <IconButton
      onClick={onToggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
        {/* Sun (shown in dark mode → click for light) */}
        <Sun
          size={18}
          weight="regular"
          aria-hidden="true"
          className="absolute transition-all duration-300 ease-out"
          style={{
            opacity: dark ? 1 : 0,
            transform: dark ? "none" : "rotate(-90deg) scale(0.6)",
          }}
        />
        {/* Moon (shown in light mode → click for dark) */}
        <Moon
          size={18}
          weight="regular"
          aria-hidden="true"
          className="absolute transition-all duration-300 ease-out"
          style={{
            opacity: dark ? 0 : 1,
            transform: dark ? "rotate(90deg) scale(0.6)" : "none",
          }}
        />
      </span>
    </IconButton>
  )
}

/**
 * Reset, with a short window to take it back.
 *
 * The reset is destructive and one click away, so for a few seconds afterwards
 * the button becomes the undo. That doubles as the confirmation — you can see
 * something happened — which is why there's no separate checkmark.
 */
function ResetButton({ onReset, onUndo }: { onReset: () => void; onUndo: () => void }) {
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
        timer.current = window.setTimeout(() => setUndoable(false), 3500)
      }}
      title={undoable ? "Restore the palette you had before resetting" : "Reset to defaults"}
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

function ShareButton({ state }: { state: ShareState }) {
  const { copied, copy } = useCopy(1400)
  return (
    <IconButton
      onClick={() => copy(shareUrl(state))}
      title="Copy a shareable link to this palette"
    >
      <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
        {/* Link icon → check crossfade on copy. */}
        <LinkSimple
          size={18}
          weight="regular"
          aria-hidden="true"
          className="absolute transition-all duration-200 ease-out"
          style={{ opacity: copied ? 0 : 1, transform: copied ? "scale(0.7)" : "none" }}
        />
        <Check
          size={18}
          weight="bold"
          aria-hidden="true"
          className="absolute text-emerald-500 transition-all duration-200 ease-out"
          style={{ opacity: copied ? 1 : 0, transform: copied ? "none" : "scale(0.7)" }}
        />
      </span>
    </IconButton>
  )
}

function Attribution() {
  return (
    <footer className="border-line text-ash mt-12 flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-6 text-sm">
      <span>Built by</span>
      <a
        href="https://www.linkedin.com/in/imryanreid/"
        target="_blank"
        rel="noreferrer"
        className="border-line hover:border-ink/30 hover:bg-ink/[0.04] inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 transition-all duration-200 hover:-translate-y-0.5"
      >
        <img src={avatarUrl} alt="Ryan Reid" className="h-6 w-6 rounded-full object-cover" />
        <span className="text-ink font-medium">Ryan Reid</span>
      </a>
      <span>at</span>
      <a
        href="https://www.tktk.studio/"
        target="_blank"
        rel="noreferrer"
        className="border-line hover:border-ink/30 hover:bg-ink/[0.04] inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 transition-all duration-200 hover:-translate-y-0.5"
      >
        <img src={studioLogo} alt="tktk studio" className="h-6 w-6 rounded-full object-cover" />
        <span className="text-ink font-medium">tktk studio</span>
      </a>
    </footer>
  )
}

function ExportModal({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <motion.div
        className="border-line bg-paper mt-6 w-full max-w-3xl rounded-xl border p-5 shadow-xl sm:mt-10 sm:p-6"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.985 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">Export</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ash hover:bg-ink/[0.06] hover:text-ink rounded p-1.5 transition-colors"
          >
            <X size={18} weight="regular" aria-hidden="true" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-ash mb-3 font-mono text-[11px] tracking-[0.16em] uppercase">
      {children}
    </h2>
  )
}

/**
 * WCAG contrast target. Changing this re-resolves every semantic token: paired
 * foregrounds walk their ramp until they clear the ratio, and action fills move
 * too when a foreground runs out of ramp. See `resolveTokens` in lib/semantics.
 */
function ComplianceToggle({
  compliance,
  onChange,
}: {
  compliance: Compliance
  onChange: (c: Compliance) => void
}) {
  const options: { id: Compliance; label: string; title: string }[] = [
    { id: "AA", label: "AA", title: "WCAG AA — 4.5:1 minimum for normal text" },
    { id: "AAA", label: "AAA", title: "WCAG AAA — 7:1 minimum for normal text" },
  ]
  return (
    <div className="border-line inline-flex rounded-md border p-0.5">
      {options.map((o) => {
        const active = compliance === o.id
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            title={o.title}
            aria-pressed={active}
            className={cn(
              "relative rounded px-3 py-1.5 font-mono text-xs transition-colors",
              active ? "text-paper" : "text-ash hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="compliance-pill"
                className="bg-ink absolute inset-0 rounded"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        )
      })}
    </div>
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
  return (
    <div className="relative">
      <select
        value={format}
        onChange={(e) => onChange(e.target.value as ColorFormat)}
        aria-label="Color notation"
        className="border-line bg-paper text-ink hover:border-ink/30 focus-visible:ring-ink/30 cursor-pointer appearance-none rounded-md border py-1.5 pr-8 pl-3 font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {COLOR_FORMATS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
      <CaretDown
        size={12}
        weight="bold"
        aria-hidden="true"
        className="text-ash pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
      />
    </div>
  )
}

function ModeToggle({ mode, onChange }: { mode: DsMode; onChange: (m: DsMode) => void }) {
  const options: { id: DsMode; label: string }[] = [
    { id: "full", label: "Full" },
    { id: "basic", label: "Lite" },
  ]
  return (
    <div className="border-line inline-flex rounded-md border p-0.5">
      {options.map((o) => {
        const active = mode === o.id
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "relative rounded px-3 py-1.5 font-mono text-xs transition-colors",
              active ? "text-paper" : "text-ash hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="mode-pill"
                className="bg-ink absolute inset-0 rounded"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
