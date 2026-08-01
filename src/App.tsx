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
import { buildPalette, deriveAccentHex, type DsMode, type Scheme, type Palette } from "./lib/recommend"
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
  const reset = () => {
    setBrand(DEFAULT_STATE.brand)
    setAccentOverride(DEFAULT_STATE.accentOverride)
    setMode(DEFAULT_STATE.mode)
    setScheme(DEFAULT_STATE.scheme)
    setCompliance(DEFAULT_STATE.compliance)
    setFormat(DEFAULT_STATE.format)
    setExcludedRamps(new Set())
    setExcludedTokens(new Set())
  }

  const accentLocked = accentOverride !== null
  const autoAccent = useMemo(() => deriveAccentHex(brand, scheme), [brand, scheme])
  const palette = useMemo(
    () => buildPalette(brand, accentOverride, mode, scheme),
    [brand, accentOverride, mode, scheme],
  )

  // True while the visitor is still looking at the untouched default palette.
  // Used to keep the bare landing page clean: no query string in the address
  // bar and no palette-specific <title>, so that's what crawlers index.
  const isDefault =
    brand === DEFAULT_STATE.brand &&
    accentOverride === DEFAULT_STATE.accentOverride &&
    mode === DEFAULT_STATE.mode &&
    scheme === DEFAULT_STATE.scheme &&
    compliance === DEFAULT_STATE.compliance &&
    format === DEFAULT_STATE.format &&
    excludedRamps.size === 0 &&
    excludedTokens.size === 0

  // Keep the address bar in sync so a copy/paste of the URL also reproduces state.
  useEffect(() => {
    try {
      window.history.replaceState(null, "", isDefault ? "/" : `?${encodeShareState(shareState)}`)
    } catch {
      // Ignore — some browsers disallow history writes in restricted contexts.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shareState is rebuilt each render
  }, [brand, accentOverride, mode, scheme, compliance, format, excludedRamps, excludedTokens, isDefault])

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
    document.title = `Ramp Generator — brand ${brand} · ${scheme} · ${mode} · ${compliance}`
    setMeta("name", "description", describePalette(shareState))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shareState is rebuilt each render
  }, [brand, accentOverride, mode, scheme, compliance, excludedRamps, excludedTokens, isDefault])

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
              />
            </ExportModal>
          )}
        </AnimatePresence>

        <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10 lg:py-14">
        {/* Controls — top row */}
        <section className="mb-12 border-b border-line pb-10">
          {/* Narrow screens put the action stack on its own line above the
              title, rather than squeezing the header copy into a sliver. */}
          <div className="mb-8 flex flex-col-reverse items-start gap-5 sm:flex-row sm:justify-between sm:gap-4">
            <header>
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ash">
                ramps.studio
              </p>
              <h1 className="font-display text-3xl font-semibold leading-none tracking-tight">
                Color Ramp Generator
              </h1>
              <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-ash">
                Generate agent-optimized, accessible color ramps in a few
                clicks.
              </p>
            </header>

            {/* Top-right action stack — theme, share, export (icon-only). */}
            <div className="flex items-center gap-2">
              <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
              <ResetButton onReset={reset} />
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
            <BrandField brand={brand} onBrandChange={setBrand} />

            {/*
              Accent and Derivation are coupled: while the accent is on Auto,
              Derivation is what produces it. They share a wrapper so they wrap
              together, with a rule drawn between them to show the link. On
              Manual the rule disappears and Derivation dims — it still shapes
              accent-2, the neutral tint and status vividness, so it stays
              selectable rather than being disabled outright.
            */}
            <div className="flex min-w-[300px] flex-1 flex-col gap-4 sm:flex-row sm:items-end sm:gap-0">
              <AccentField
                accentOverride={accentOverride}
                autoAccent={autoAccent}
                onAccentChange={setAccentOverride}
                onAccentReset={() => setAccentOverride(null)}
              />
              <div
                aria-hidden="true"
                className={cn(
                  "mb-[17px] hidden h-px w-8 shrink-0 transition-colors sm:block",
                  accentLocked ? "bg-transparent" : "bg-line",
                )}
              />
              <div className="min-w-[180px] flex-1">
                <SectionLabel>Derivation</SectionLabel>
                <div
                  className={cn("transition-opacity", accentLocked && "opacity-45")}
                  title={
                    accentLocked
                      ? "The accent is set manually, so derivation no longer produces it — it still shapes accent-2, the neutral tint and status colors."
                      : undefined
                  }
                >
                  <SchemeSelect scheme={scheme} onChange={setScheme} />
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
    "# Ramp Generator — machine-readable palette",
    "# Deterministically derived from the URL query string:",
    "#   b = brand hex (no #)   a = accent hex (optional, omit for auto)",
    "#   m = scope: full | basic",
    "#   s = derivation: complementary | analogous | triadic | split | monochromatic",
    "#   c = contrast target: AA (4.5:1) | AAA (7:1)",
    "#   xr / xt = dot-separated ramp / token names the author deselected",
    `# This palette: b=${state.brand.replace("#", "")}` +
      `${state.accentOverride ? ` a=${state.accentOverride.replace("#", "")}` : ""}` +
      ` m=${state.mode} s=${state.scheme} c=${state.compliance}`,
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
    <section className="mb-12" aria-label="Machine-readable palette for agents">
      <details className="group rounded-lg border border-line">
        <summary className="cursor-pointer list-none px-4 py-3 font-mono text-xs text-ash transition-colors hover:text-ink">
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
        <div className="border-t border-line">
          {/* Legend stays outside the copyable block so the copied code is valid. */}
          <pre className="whitespace-pre-wrap px-4 pt-3 font-mono text-[11px] leading-relaxed text-ash">
            {legend}
          </pre>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="inline-flex rounded-md border border-line p-0.5">
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
                        className="absolute inset-0 rounded bg-ink"
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
              className="inline-flex items-center gap-1.5 rounded-md border border-ink/20 px-3 py-1.5 font-mono text-[11px] text-ink transition-colors hover:bg-ink/[0.04]"
            >
              {copied ? "Copied" : `Copy ${format.toUpperCase()}`}
            </button>
          </div>
          <pre className="overflow-x-auto border-t border-line px-4 py-3 font-mono text-[11px] leading-relaxed text-ink">
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
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
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
    <IconButton onClick={onToggle} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
      <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
        {/* Sun (shown in dark mode → click for light) */}
        <Sun
          size={18}
          weight="regular"
          aria-hidden="true"
          className="absolute transition-all duration-300 ease-out"
          style={{ opacity: dark ? 1 : 0, transform: dark ? "none" : "rotate(-90deg) scale(0.6)" }}
        />
        {/* Moon (shown in light mode → click for dark) */}
        <Moon
          size={18}
          weight="regular"
          aria-hidden="true"
          className="absolute transition-all duration-300 ease-out"
          style={{ opacity: dark ? 0 : 1, transform: dark ? "rotate(90deg) scale(0.6)" : "none" }}
        />
      </span>
    </IconButton>
  )
}

/**
 * Reset, with the same brief checkmark the share button uses — otherwise
 * clearing an already-default palette looks like a dead click.
 */
function ResetButton({ onReset }: { onReset: () => void }) {
  const [done, setDone] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => window.clearTimeout(timer.current ?? undefined), [])

  return (
    <IconButton
      onClick={() => {
        onReset()
        setDone(true)
        window.clearTimeout(timer.current ?? undefined)
        timer.current = window.setTimeout(() => setDone(false), 1400)
      }}
      title="Reset to defaults"
      variant="danger"
    >
      <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
        <ArrowCounterClockwise
          size={18}
          weight="regular"
          aria-hidden="true"
          className="absolute transition-all duration-200 ease-out"
          style={{ opacity: done ? 0 : 1, transform: done ? "scale(0.7)" : "none" }}
        />
        <Check
          size={18}
          weight="bold"
          aria-hidden="true"
          className="absolute text-emerald-500 transition-all duration-200 ease-out"
          style={{ opacity: done ? 1 : 0, transform: done ? "none" : "scale(0.7)" }}
        />
      </span>
    </IconButton>
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
    <footer className="mt-12 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-6 text-sm text-ash">
      <span>Built by</span>
      <a
        href="https://www.linkedin.com/in/imryanreid/"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/30 hover:bg-ink/[0.04]"
      >
        <img
          src={avatarUrl}
          alt="Ryan Reid"
          className="h-6 w-6 rounded-full object-cover"
        />
        <span className="font-medium text-ink">Ryan Reid</span>
      </a>
      <span>at</span>
      <a
        href="https://www.tktk.studio/"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/30 hover:bg-ink/[0.04]"
      >
        <img
          src={studioLogo}
          alt="tktk studio"
          className="h-6 w-6 rounded-full object-cover"
        />
        <span className="font-medium text-ink">tktk studio</span>
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
        className="mt-6 w-full max-w-3xl rounded-xl border border-line bg-paper p-5 shadow-xl sm:mt-10 sm:p-6"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.985 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Export
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1.5 text-ash transition-colors hover:bg-ink/[0.06] hover:text-ink"
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
    <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ash">
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
    <div className="inline-flex rounded-md border border-line p-0.5">
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
                className="absolute inset-0 rounded bg-ink"
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
        className="cursor-pointer appearance-none rounded-md border border-line bg-paper py-1.5 pl-3 pr-8 font-mono text-xs text-ink transition-colors hover:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
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
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ash"
      />
    </div>
  )
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: DsMode
  onChange: (m: DsMode) => void
}) {
  const options: { id: DsMode; label: string }[] = [
    { id: "full", label: "Full" },
    { id: "basic", label: "Lite" },
  ]
  return (
    <div className="inline-flex rounded-md border border-line p-0.5">
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
                className="absolute inset-0 rounded bg-ink"
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
