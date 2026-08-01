// ==============================================
// EXPORT PANEL
// The contents of the export modal: a tab per output
// format (CSS variables, Tailwind v4, Figma
// variables, JSON), with copy and download actions.
// The Figma tab exports one W3C DTCG file per mode.
// ==============================================
import { useState, type CSSProperties } from "react"
import { AnimatePresence, motion } from "motion/react"
import { toCss, toTailwind, toJson, toFigma, type DsMode } from "../lib/semantics"
import type { Palette } from "../lib/recommend"
import { cn } from "../lib/utils"
import CopyText from "./CopyText"

type Tab = "css" | "tailwind" | "figma" | "json"

const TABS: { id: Tab; label: string }[] = [
  { id: "css", label: "CSS variables" },
  { id: "tailwind", label: "Tailwind v4" },
  { id: "figma", label: "Figma variables" },
  { id: "json", label: "JSON tokens" },
]

const RENDER: Record<Tab, (p: Palette, m: DsMode) => string> = {
  css: toCss,
  tailwind: toTailwind,
  figma: toFigma,
  json: toJson,
}

// Filename + mime per tab. Figma/JSON download as .json (what import plugins
// expect); CSS/Tailwind as .css.
const FILE: Record<Tab, { name: string; mime: string }> = {
  css: { name: "tokens.css", mime: "text/css" },
  tailwind: { name: "theme.css", mime: "text/css" },
  figma: { name: "figma-variables.json", mime: "application/json" },
  json: { name: "design-tokens.json", mime: "application/json" },
}

type ColorMode = "light" | "dark"

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

export default function ExportPanel({ palette, mode }: { palette: Palette; mode: DsMode }) {
  const [tab, setTab] = useState<Tab>("css")
  const [colorMode, setColorMode] = useState<ColorMode>("light")

  // The Figma tab is single-mode per file; other tabs carry both modes inline.
  const code = tab === "figma" ? toFigma(palette, mode, colorMode) : RENDER[tab](palette, mode)
  const file =
    tab === "figma"
      ? { name: `${colorMode === "dark" ? "Dark" : "Light"}.json`, mime: "application/json" }
      : FILE[tab]

  return (
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
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 2v8m0 0L5 7m3 3l3-3M3 13h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
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
  )
}
