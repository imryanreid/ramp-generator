// ==============================================
// EXPORT PANEL
// The contents of the export modal. Opens on a
// two-way choice: take the tokens as code, or copy a
// ready-made prompt pointing an agent at this exact
// palette. The code branch has a tab per format
// (CSS variables, Tailwind v4, Figma variables,
// JSON); the Figma tab exports one W3C DTCG file per
// mode.
// ==============================================
import { useState, type CSSProperties, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  toCss,
  toTailwind,
  toJson,
  toFigma,
  missingContrastReferences,
  type ExportOptions,
  type ContrastReference,
} from "../lib/semantics"
import type { Palette } from "../lib/recommend"
import { cn } from "../shared/utils"
import CopyText from "../shared/components/CopyText"
import { ArrowLeft, Code, DownloadSimple, Sparkle, CaretRight } from "@phosphor-icons/react"

type Stage = "choose" | "code" | "prompt"
type Tab = "css" | "tailwind" | "figma" | "json"
type ColorMode = "light" | "dark"

const TABS: { id: Tab; label: string }[] = [
  { id: "css", label: "CSS" },
  { id: "tailwind", label: "Tailwind" },
  { id: "figma", label: "Figma" },
  { id: "json", label: "JSON" },
]

// Filename + mime per tab. Figma/JSON download as .json (what import plugins
// expect); CSS/Tailwind as .css.
const FILE: Record<Tab, { name: string; mime: string }> = {
  css: { name: "tokens.css", mime: "text/css" },
  tailwind: { name: "theme.css", mime: "text/css" },
  figma: { name: "figma-variables.json", mime: "application/json" },
  json: { name: "design-tokens.json", mime: "application/json" },
}

function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * The prompt handed to an agent. Deliberately points at the share URL rather
 * than inlining thousands of characters of tokens: the page already renders the
 * whole palette as plain text, so the agent can read it there. The code tab is
 * the fallback for agents that can't browse.
 */
function agentPrompt(
  url: string,
  o: ExportOptions,
  omitted: number,
  references: ContrastReference[],
): string {
  const compliance = o.compliance ?? "AA"
  const ratio = compliance === "AAA" ? "7:1" : "4.5:1"
  const scope =
    (o.mode ?? "full") === "full"
      ? "the full token set, including hover/active states and subtle feedback surfaces"
      : "the core token set"
  return `Use this color palette as the design foundation for my project.

Palette: ${url}

That page contains the complete palette in machine-readable form — every ramp
step (50-950) and every semantic token, resolved for both light and dark themes.
It covers ${scope}. The same data is available as JSON at
${url.replace("/?", "/api/palette?")}.

When you apply it:

- Prefer the semantic tokens (bg-*, text-*, border-*, ring-*) over raw ramp
  steps wherever a token exists. The tokens already carry the light/dark
  mapping, so using them means dark mode works without a second pass.
- The token steps are tuned so every paired foreground clears WCAG ${compliance}
  (${ratio}). Don't substitute your own colors into those pairs — it will
  quietly break the contrast guarantee.
- Use the hex values exactly as given. The ramps are OKLCH-derived and
  perceptually even; re-deriving them in sRGB will drift.${
    omitted
      ? `
- I have deliberately left ${omitted} row(s) out of this palette. Treat what the
  page lists as the complete set — don't add colors back in to fill gaps.`
      : ""
  }${references
    .map(
      (r) => `
- ${r.token} is not part of this palette, but ${r.measures.join(", ")} were
  measured against it (${r.light} light / ${r.dark} dark). If you put a
  different background behind those, re-check the contrast — the WCAG
  ${compliance} claim only holds against those values.`,
    )
    .join("")}

Set up the tokens first, then use them to style the components we build.`
}

export default function ExportPanel({
  palette,
  options,
  shareHref,
  onPrint,
}: {
  palette: Palette
  options: ExportOptions
  shareHref: string
  onPrint: () => void
}) {
  const [stage, setStage] = useState<Stage>("choose")
  const omitted = (options.excludedRamps?.size ?? 0) + (options.excludedTokens?.size ?? 0)
  const references = missingContrastReferences(palette, options)

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stage}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
      >
        {stage === "choose" && <Chooser onPick={setStage} onPrint={onPrint} />}
        {stage === "code" && (
          <CodeExport palette={palette} options={options} onBack={() => setStage("choose")} />
        )}
        {stage === "prompt" && (
          <PromptExport
            prompt={agentPrompt(shareHref, options, omitted, references)}
            onBack={() => setStage("choose")}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

/** Step one — how do you want to take this palette out of here? */
// `onPrint` is kept wired but unexposed: the print stylesheet works, but the
// PDF output needs design work before it earns a place in this menu.
function Chooser({ onPick }: { onPick: (s: Stage) => void; onPrint: () => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ChoiceCard
        icon={<Code size={22} weight="regular" />}
        title="Export code"
        body="CSS variables, a Tailwind v4 theme, Figma variables, or JSON. Copy or download."
        onClick={() => onPick("code")}
      />
      <ChoiceCard
        icon={<Sparkle size={22} weight="regular" />}
        title="Copy agent prompt"
        body="A ready-to-paste prompt with a link to this palette, for Claude, GPT, or any coding agent."
        onClick={() => onPick("prompt")}
      />
    </div>
  )
}

function ChoiceCard({
  icon,
  title,
  body,
  onClick,
}: {
  icon: ReactNode
  title: string
  body: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group border-line hover:border-ink/30 hover:bg-ink/[0.03] flex h-full flex-col items-start rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5"
    >
      <span className="text-ink mb-3">{icon}</span>
      <span className="font-display mb-1 flex w-full items-center justify-between gap-2 text-base font-semibold tracking-tight">
        {title}
        <CaretRight
          size={14}
          weight="bold"
          className="text-ash shrink-0 transition-transform group-hover:translate-x-0.5"
        />
      </span>
      <span className="text-ash text-sm leading-relaxed">{body}</span>
    </button>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="text-ash hover:text-ink mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] transition-colors"
    >
      <ArrowLeft size={13} weight="bold" />
      back
    </button>
  )
}

function PromptExport({ prompt, onBack }: { prompt: string; onBack: () => void }) {
  return (
    <div>
      <BackButton onBack={onBack} />
      <div
        className="border-line bg-ink overflow-hidden rounded-lg border"
        // Pin ink/paper so the terminal stays dark even when the page is in dark mode.
        style={{ "--color-ink": "#16150f", "--color-paper": "#fdfdfc" } as CSSProperties}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
          <p className="font-mono text-[11px] text-white/45">
            Paste into any agent that can open a link
          </p>
          <CopyText
            value={prompt}
            title="Copy prompt"
            swapOnCopy
            className="text-paper shrink-0 rounded border border-white/15 px-2.5 py-1 font-mono text-[11px] hover:bg-white/10 hover:opacity-100"
          >
            copy prompt
          </CopyText>
        </div>
        <pre className="max-h-[60vh] overflow-auto p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-white/85">
          {prompt}
        </pre>
      </div>
      <p className="text-ash mt-3 text-xs leading-relaxed">
        Working with an agent that can't browse the web? Use{" "}
        <span className="text-ink font-medium">Export code</span> instead and paste the tokens
        directly.
      </p>
    </div>
  )
}

function CodeExport({
  palette,
  options,
  onBack,
}: {
  palette: Palette
  options: ExportOptions
  onBack: () => void
}) {
  const [tab, setTab] = useState<Tab>("css")
  const [colorMode, setColorMode] = useState<ColorMode>("light")

  // The Figma tab is single-mode per file; other tabs carry both modes inline.
  const code =
    tab === "figma"
      ? toFigma(palette, { ...options, colorMode })
      : tab === "css"
        ? toCss(palette, options)
        : tab === "tailwind"
          ? toTailwind(palette, options)
          : toJson(palette, options)

  const file =
    tab === "figma"
      ? { name: `${colorMode === "dark" ? "Dark" : "Light"}.json`, mime: "application/json" }
      : FILE[tab]

  return (
    <div>
      <BackButton onBack={onBack} />
      <div
        className="border-line bg-ink overflow-hidden rounded-lg border"
        // Pin ink/paper so the terminal stays dark even when the page is in dark mode.
        style={{ "--color-ink": "#16150f", "--color-paper": "#fdfdfc" } as CSSProperties}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-2">
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative px-3 py-2.5 font-mono text-xs transition-colors",
                  tab === t.id ? "text-paper" : "text-white/40 hover:text-white/70",
                )}
              >
                {t.label}
                {tab === t.id && (
                  <motion.span
                    layoutId="export-tab-underline"
                    className="bg-paper absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                    transition={{ type: "spring", stiffness: 480, damping: 38 }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => download(file.name, file.mime, code)}
              title={`Download ${file.name}`}
              className="text-paper inline-flex items-center gap-1.5 rounded border border-white/15 px-2.5 py-1 font-mono text-[11px] transition-colors hover:bg-white/10"
            >
              <DownloadSimple size={12} weight="bold" />
              download
            </button>
            {/* cn() inside CopyText resolves the hover-opacity conflict, so the
                plain utility is enough — no `!important` needed. */}
            <CopyText
              value={code}
              title="Copy all"
              swapOnCopy
              className="text-paper rounded border border-white/15 px-2.5 py-1 font-mono text-[11px] hover:bg-white/10 hover:opacity-100"
            >
              copy
            </CopyText>
          </div>
        </div>
        {tab === "figma" && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
            <p className="font-mono text-[11px] leading-relaxed text-white/45">
              W3C DTCG · one mode per file — use Figma's native variable Import, one per mode
            </p>
            <div className="inline-flex rounded border border-white/15 p-0.5">
              {(["light", "dark"] as ColorMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setColorMode(m)}
                  className={cn(
                    "relative rounded px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase transition-colors",
                    colorMode === m ? "text-paper" : "text-white/45 hover:text-white/80",
                  )}
                >
                  {colorMode === m && (
                    <motion.span
                      layoutId="export-mode-pill"
                      className="absolute inset-0 rounded bg-white/15"
                      transition={{ type: "spring", stiffness: 480, damping: 38 }}
                    />
                  )}
                  <span className="relative z-10">{m}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.pre
            key={`${tab}-${colorMode}`}
            className="max-h-[60vh] overflow-auto p-4 font-mono text-[12px] leading-relaxed text-white/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            {code}
          </motion.pre>
        </AnimatePresence>
      </div>
    </div>
  )
}
