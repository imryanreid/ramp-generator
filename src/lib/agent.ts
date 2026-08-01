// ==============================================
// AGENT PAYLOAD
// One place that turns a URL query string into the
// palette an agent should receive — as structured
// JSON and as plain readable text.
//
// Both shapes are emitted deliberately. A fetch of
// this site is usually converted from HTML to
// markdown before an agent reads it, and that
// conversion strips <script> tags — so a JSON-only
// payload would be invisible to exactly the tools
// this exists for. The text block survives.
//
// Imported by the Vercel Functions in /api, so this
// file must stay free of browser and Vite globals.
// ==============================================
import { STEPS, getSwatch } from "./color.js"
import { buildPalette } from "./recommend.js"
import {
  resolveTokens,
  allRamps,
  missingContrastReferences,
  type ContrastReference,
} from "./semantics.js"
import { resolveShareState, encodeShareState, type ShareState } from "./params.js"

/**
 * The public origin for a request. Vercel invokes functions with an internal
 * host, so links built from `request.url` would leak that instead of the real
 * domain — the forwarded headers carry the address the visitor actually used.
 */
export function publicOrigin(request: Request): string {
  const url = new URL(request.url)
  const host = request.headers.get("x-forwarded-host") ?? url.host
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")
  return `${proto}://${host}`
}

export type AgentPayload = {
  state: ShareState
  json: PaletteJson
  text: string
}

type PaletteJson = {
  $schema: "https://www.ramps.studio/llms.txt"
  generator: string
  source: string
  input: {
    brand: string
    accent: string | null
    accent2: string | null
    scope: string
    scheme: string
    wcag: string
    excludedRamps: string[]
    excludedTokens: string[]
  }
  ramps: Record<string, Record<string, string>>
  tokens: Record<string, { light: string; dark: string; role: string; step: string }>
  /**
   * Backgrounds the author excluded that retained foregrounds were still
   * measured against. Not part of the palette — supplied so the contrast
   * guarantee stays verifiable.
   */
  contrastReferences?: ContrastReference[]
  notes: string[]
}

/** Everything an agent needs, derived from a query string. */
export function buildAgentPayload(search: string, origin: string): AgentPayload {
  const state = resolveShareState(search)
  const canonical = `${origin}/?${encodeShareState(state)}`

  const palette = buildPalette(
    state.brand,
    state.accentOverride,
    state.mode,
    state.scheme,
    state.accent2Override,
  )

  const excludedRamps = new Set(state.excludedRamps)
  const excludedTokens = new Set(state.excludedTokens)
  const ramps = allRamps(palette).filter((r) => !excludedRamps.has(r.name))
  const tokens = resolveTokens(palette, state.mode, state.compliance).filter(
    (t) => !excludedTokens.has(t.token),
  )
  const ratio = state.compliance === "AAA" ? "7:1" : "4.5:1"
  const references = missingContrastReferences(palette, {
    mode: state.mode,
    compliance: state.compliance,
    excludedTokens,
  })

  const notes = [
    `Every paired foreground meets WCAG ${state.compliance} (${ratio}) against its background. Do not substitute other colors into those pairs.`,
    "Prefer the semantic tokens over raw ramp steps; they already carry the light/dark mapping.",
    "Ramps are OKLCH-derived and perceptually even. Use these hex values verbatim rather than re-deriving them.",
  ]
  // An agent applying two identical tokens should know they're identical.
  const collided = tokens.filter((t) => t.warnings?.length)
  if (collided.length) {
    const pairs = new Set<string>()
    for (const t of collided) {
      for (const w of t.warnings!) {
        for (const other of w.sameAs) pairs.add([t.token, other].sort().join(" and "))
      }
    }
    notes.push(
      `These tokens resolve to the same value and won't be distinguishable in use: ${[...pairs].join("; ")}. ${collided[0].warnings![0].reason}`,
    )
  }
  if (state.excludedRamps.length || state.excludedTokens.length) {
    notes.push(
      `The author deselected ${state.excludedRamps.length} ramp(s) and ${state.excludedTokens.length} token(s). What is listed here is the complete intended palette — do not add colors back to fill gaps.`,
    )
  }
  for (const r of references) {
    notes.push(
      `${r.token} is not part of this palette, but ${r.measures.join(", ")} were measured against it (${r.light} light / ${r.dark} dark). If you use a different background behind those, re-check the contrast yourself — the WCAG ${state.compliance} claim above only holds against these values.`,
    )
  }

  const json: PaletteJson = {
    $schema: "https://www.ramps.studio/llms.txt",
    generator: "Ramps Studio — https://www.ramps.studio",
    source: canonical,
    input: {
      brand: state.brand,
      accent: state.accentOverride,
      accent2: state.accent2Override,
      scope: state.mode,
      scheme: state.scheme,
      wcag: state.compliance,
      excludedRamps: state.excludedRamps,
      excludedTokens: state.excludedTokens,
    },
    ramps: Object.fromEntries(
      ramps.map((r) => [
        r.name,
        Object.fromEntries(STEPS.map((step) => [String(step), getSwatch(r, step).hex])),
      ]),
    ),
    tokens: Object.fromEntries(
      tokens.map((t) => [
        t.token,
        {
          light: t.lightHex,
          dark: t.darkHex,
          role: t.role,
          step: `${t.light.ramp}-${t.light.step}`,
        },
      ]),
    ),
    ...(references.length ? { contrastReferences: references } : {}),
    notes,
  }

  const lines: string[] = [
    "RAMPS STUDIO — GENERATED COLOR PALETTE",
    `Source: ${canonical}`,
    "",
    `Brand ${state.brand} · accent ${state.accentOverride ?? "auto-derived"} · accent-2 ${state.accent2Override ?? "auto-derived"} · ${state.scheme} derivation · ${state.mode} scope · WCAG ${state.compliance}`,
    "",
    "RAMPS (OKLCH-derived, 50 lightest to 950 darkest)",
  ]
  for (const r of ramps) {
    lines.push(`  ${r.name}:`)
    lines.push(`    ${STEPS.map((s) => `${s}=${getSwatch(r, s).hex}`).join("  ")}`)
  }
  lines.push("", "SEMANTIC TOKENS (token · light · dark · role)")
  let category = ""
  for (const t of tokens) {
    if (t.category !== category) {
      category = t.category
      lines.push(`  [${category}]`)
    }
    lines.push(`    ${t.token.padEnd(20)} ${t.lightHex}  ${t.darkHex}  ${t.role}`)
  }
  lines.push("", "NOTES")
  for (const n of notes) lines.push(`  - ${n}`)
  lines.push(
    "",
    "REGENERATE WITH DIFFERENT INPUTS",
    `  ${origin}/?b=<brand hex, no #>&m=full|basic&s=complementary|analogous|triadic|split|monochromatic&c=AA|AAA`,
    `  JSON: ${origin}/api/palette?b=<brand hex, no #>`,
    `  Full contract: ${origin}/llms.txt`,
  )

  return { state, json, text: lines.join("\n") }
}
