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
  type DsMode,
  type Compliance,
} from "../lib/semantics"
import type { Palette } from "../lib/recommend"
import { cn } from "../lib/utils"
import CopyText from "./CopyText"
import {
  ArrowLeft,
  Code,
  DownloadSimple,
  Sparkle,
  CaretRight,
} from "@phosphor-icons/react"

type Stage = "choose" | "code" | "prompt"
type Tab = "css" | "tailwind" | "figma" | "json"
type ColorMode = "light" | "dark"

const TABS: { id: Tab; label: string }[] = [
  { id: "css", label: "CSS variables" },
  { id: "tailwind", label: "Tailwind v4" },
  { id: "figma", label: "Figma variables" },
  { id: "json", label: "JSON tokens" },
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
function agentPrompt(url: string, compliance: Compliance, mode: DsMode): string {
  const ratio = compliance === "AAA" ? "7:1" : "4.5:1"
  const scope =
    mode === "full"
      ? "the full token set, including hover/active states and subtle feedback surfaces"
      : "the core token set"
  return `Use this color palette as the design foundation for my project.

Palette: ${url}

That page contains the complete palette in machine-readable form. Open the
"Machine-readable palette" section for every ramp step (50-950) and every
semantic token, resolved for both light and dark themes. It covers ${scope}.

When you apply it:

- Prefer the semantic tokens (bg-*, text-*, border-*, ring-*) over raw ramp
  steps wherever a token exists. The tokens already carry the light/dark
  mapping, so using them means dark mode works without a second pass.
- The token steps are tuned so every paired foreground clears WCAG ${compliance}
  (${ratio}). Don't substitute your own colors into those pairs — it will
  quietly break the contrast guarantee.
- Use the hex values exactly as given. The ramps are OKLCH-derived and
  perceptually even; re-deriving them in sRGB will drift.

Set up the tokens first, then use them to style the components we build.`
}

export default function ExportPanel({
  palette,
  mode,
  compliance,
  shareHref,
}: {
  palette: Palette
  mode: DsMode
  compliance: Compliance
  shareHref: string
}) {
  const [stage, setStage] = useState<Stage>("choose")

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stage}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
      >
        {stage === "choose" && <Chooser onPick={setStage} />}
        {stage === "code" && (
          <CodeExport
            palette={palette}
            mode={mode}
            compliance={compliance}
            onBack={() => setStage("choose")}
          />
        )}
        {stage === "prompt" && (
          <PromptExport
            prompt={agentPrompt(shareHref, compliance, mode)}
            onBack={() => setStage("choose")}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

/** Step one — how do you want to take this palette out of here? */
function Chooser({ onPick }: { onPick: (s: Stage) => void }) {
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
      className="group flex h-full flex-col items-start rounded-lg border border-line p-4 text-left transition-all hover:-translate-y-0.5 hover:border-ink/30 hover:bg-ink/[0.03]"
    >
      <span className="mb-3 text-ink">{icon}</span>
      <span className="mb-1 flex w-full items-center justify-between gap-2 font-display text-base font-semibold tracking-tight">
        {title}
        <CaretRight
          size={14}
          weight="bold"
          className="shrink-0 text-ash transition-transform group-hover:translate-x-0.5"
        />
      </span>
      <span className="text-sm leading-relaxed text-ash">{body}</span>
    </button>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] text-ash transition-colors hover:text-ink"
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
        className="overflow-hidden rounded-lg border border-line bg-ink"
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
            className="shrink-0 rounded border border-white/15 px-2.5 py-1 font-mono text-[11px] text-paper hover:bg-white/10 hover:opacity-100"
          >
            copy prompt
          </CopyText>
        </div>
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-4 font-mono text-[12px] leading-relaxed text-white/85">
          {prompt}
        </pre>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ash">
        Working with an agent that can't browse the web? Use{" "}
        <span className="font-medium text-ink">Export code</span> instead and paste
        the tokens directly.
      </p>
    </div>
  )
}

function CodeExport({
  palette,
  mode,
  compliance,
  onBack,
}: {
  palette: Palette
  mode: DsMode
  compliance: Compliance
  onBack: () => void
}) {
  const [tab, setTab] = useState<Tab>("css")
  const [colorMode, setColorMode] = useState<ColorMode>("light")

  // The Figma tab is single-mode per file; other tabs carry both modes inline.
  const code =
    tab === "figma"
      ? toFigma(palette, mode, colorMode, compliance)
      : tab === "css"
        ? toCss(palette, mode, compliance)
        : tab === "tailwind"
          ? toTailwind(palette, mode, compliance)
          : toJson(palette, mode, compliance)

  const file =
    tab === "figma"
      ? { name: `${colorMode === "dark" ? "Dark" : "Light"}.json`, mime: "application/json" }
      : FILE[tab]

  return (
    <div>
      <BackButton onBack={onBack} />
      <div
        className="overflow-hidden rounded-lg border border-line bg-ink"
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
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-paper"
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
              className="inline-flex items-center gap-1.5 rounded border border-white/15 px-2.5 py-1 font-mono text-[11px] text-paper transition-colors hover:bg-white/10"
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
              className="rounded border border-white/15 px-2.5 py-1 font-mono text-[11px] text-paper hover:bg-white/10 hover:opacity-100"
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
                    "relative rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-colors",
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
