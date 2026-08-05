// ==============================================
// EXPORT PANEL — RAMPS
// What this tool puts into the shared export shell:
// four destinations, the Figma mode switch, and the
// prompt handed to an agent.
//
// The shell itself — the code/prompt fork, the dark
// terminal, the tabs, download and copy — lives in
// src/shared and is identical in every tool. Nothing
// about the layout is decided here.
// ==============================================
import { useState } from "react"
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
import SharedExportPanel, { type ExportFormat } from "../shared/components/ExportPanel"

type ColorMode = "light" | "dark"

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
}: {
  palette: Palette
  options: ExportOptions
  shareHref: string
}) {
  // The Figma tab carries one color mode per file, so that state lives here and
  // feeds both its renderer and its filename.
  const [colorMode, setColorMode] = useState<ColorMode>("light")

  const omitted = (options.excludedRamps?.size ?? 0) + (options.excludedTokens?.size ?? 0)
  const references = missingContrastReferences(palette, options)

  const formats: ExportFormat[] = [
    {
      id: "css",
      label: "CSS",
      filename: "tokens.css",
      mime: "text/css",
      render: () => toCss(palette, options),
    },
    {
      id: "tailwind",
      label: "Tailwind",
      filename: "theme.css",
      mime: "text/css",
      render: () => toTailwind(palette, options),
    },
    {
      id: "figma",
      label: "Figma",
      filename: `${colorMode === "dark" ? "Dark" : "Light"}.json`,
      mime: "application/json",
      render: () => toFigma(palette, { ...options, colorMode }),
      options: (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
                  "rounded px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase transition-colors",
                  colorMode === m
                    ? "text-paper bg-white/15"
                    : "text-white/45 hover:text-white/80",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "json",
      label: "JSON",
      filename: "design-tokens.json",
      mime: "application/json",
      render: () => toJson(palette, options),
    },
  ]

  return (
    <SharedExportPanel
      formats={formats}
      codeBlurb="CSS variables, a Tailwind v4 theme, Figma variables, or JSON. Copy or download."
      promptBlurb="A ready-to-paste prompt with a link to this palette, for Claude, GPT, or any coding agent."
      agentPrompt={agentPrompt(shareHref, options, omitted, references)}
    />
  )
}
