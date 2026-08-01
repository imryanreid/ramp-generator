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
import { STEPS, getSwatch, contrast, toOklch, type Ramp } from "./color.js"
import { buildPalette } from "./recommend.js"
import {
  resolveTokens,
  allRamps,
  missingContrastReferences,
  CONTRAST_TARGET,
  type ContrastReference,
} from "./semantics.js"
import {
  resolveShareState,
  decodeShareState,
  encodeShareState,
  DEFAULT_STATE,
  type ShareState,
} from "./params.js"

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

/** Contrast ratios read as "12.4:1"; more precision than that is noise. */
const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * The step of a ramp perceptually closest to a given color.
 *
 * Used only to explain where an input landed. Distance is measured in OKLCH's
 * rectangular form, so hue is weighted by chroma the way perception is — a hue
 * difference between two near-greys barely counts, which is right.
 */
function nearestStep(ramp: Ramp, hex: string): { step: string; hex: string } | null {
  const target = toOklch(hex)
  if (!target) return null
  let best: { step: string; hex: string; d: number } | null = null
  for (const step of STEPS) {
    const swatch = getSwatch(ramp, step)
    const o = toOklch(swatch.hex)
    if (!o) continue
    const rad = (deg: number) => (deg * Math.PI) / 180
    const d =
      ((target.l ?? 0) - (o.l ?? 0)) ** 2 +
      ((target.c ?? 0) * Math.cos(rad(target.h ?? 0)) - (o.c ?? 0) * Math.cos(rad(o.h ?? 0))) **
        2 +
      ((target.c ?? 0) * Math.sin(rad(target.h ?? 0)) - (o.c ?? 0) * Math.sin(rad(o.h ?? 0))) **
        2
    if (!best || d < best.d) best = { step: `${ramp.name}-${step}`, hex: swatch.hex, d }
  }
  return best && { step: best.step, hex: best.hex }
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
  tokens: Record<
    string,
    {
      light: string
      dark: string
      role: string
      /**
       * Which rung of which ramp each mode landed on. Both are given because
       * the contrast resolver moves them independently — a token can sit at
       * neutral-900 in light and neutral-100 in dark, and a single step string
       * would silently describe only one of them.
       */
      step: { light: string; dark: string }
      /**
       * Measured WCAG ratios for tokens that name a background. Stated rather
       * than merely claimed, so a consumer can verify the guarantee instead of
       * trusting it — or recomputing it themselves.
       */
      contrast?: { against: string; light: number; dark: number }
    }
  >
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

  // The resolver's last resort is the best contrast a ramp can offer, which may
  // still fall short. Emitting ratios makes that visible, so the blanket claim
  // has to name its own exceptions rather than quietly overstating them.
  const target = CONTRAST_TARGET[state.compliance]
  const shortfalls = tokens.filter(
    (t) =>
      t.pairWith &&
      ((t.lightRatio !== undefined && t.lightRatio < target) ||
        (t.darkRatio !== undefined && t.darkRatio < target)),
  )

  const notes = [
    shortfalls.length
      ? `Every paired foreground meets WCAG ${state.compliance} (${ratio}) against its background, except ${shortfalls
          .map((t) => t.token)
          .join(
            ", ",
          )} — those ramps cannot reach the target, and the ratio given is the best available. Do not substitute other colors into those pairs.`
      : `Every paired foreground meets WCAG ${state.compliance} (${ratio}) against its background — the measured ratio is stated per token. Do not substitute other colors into those pairs.`,
    "Prefer the semantic tokens over raw ramp steps; they already carry the light/dark mapping.",
    "Ramps are OKLCH-derived and perceptually even. Use these hex values verbatim rather than re-deriving them.",
  ]
  // ---- Notes that explain output which is correct but reads as a mistake ----

  // No brand was asked for, so one was chosen. Saying so out loud is the
  // difference between a deliberate default and a website that quietly ships
  // in a blue nobody picked.
  if (decodeShareState(search).brand === undefined) {
    notes.push(
      `No brand color was supplied, so this palette uses the default ${DEFAULT_STATE.brand}. If you are building something that needs its own identity, request a palette with your own color instead: ${origin}/?b=<6-digit hex, no #>.`,
    )
  }

  // The input hex almost never appears verbatim — it gets pulled onto the
  // ramp's fixed lightness curve. Without this, an agent told "use the brand
  // color" finds a near-miss and can't tell whether it's a bug.
  const primary = palette.primaries[0]
  const nearest = primary && nearestStep(primary, state.brand)
  if (nearest && nearest.hex !== state.brand) {
    notes.push(
      `The brand color ${state.brand} does not appear verbatim in these ramps. Inputs are placed on a fixed lightness curve so the scale stays perceptually even, which moves the input slightly; the nearest step is ${nearest.step} (${nearest.hex}). This is expected — use the ramp values, not the original input.`,
    )
  }

  const byToken = new Map(tokens.map((t) => [t.token, t]))

  // Correct but counterintuitive: light mode has no step above neutral-50, so a
  // raised surface can't sit above a plain one and elevation reads through
  // shadow instead. Flagged so it isn't read as a duplicate-value bug.
  const surface = byToken.get("bg-surface")
  const raised = byToken.get("bg-surface-raised")
  if (surface && raised && surface.lightHex === raised.lightHex) {
    notes.push(
      `bg-surface and bg-surface-raised are the same value in light mode (${surface.lightHex}) and differ in dark. That is deliberate: the light ramp has no step above neutral-50, so elevation reads through shadow rather than tone. Use a shadow to separate a raised surface in light mode.`,
    )
  }

  // text-disabled is below the contrast minimum on purpose — WCAG exempts
  // disabled controls. The blanket compliance note above would otherwise read
  // as licence to use it as ordinary low-emphasis text, where it isn't exempt.
  const disabled = byToken.get("text-disabled")
  const canvas = byToken.get("bg-canvas")
  if (disabled && canvas) {
    notes.push(
      `text-disabled is deliberately below the WCAG minimum (${round2(contrast(disabled.lightHex, canvas.lightHex))}:1 light, ${round2(contrast(disabled.darkHex, canvas.darkHex))}:1 dark). WCAG exempts disabled controls, so this is correct — but the exemption does not extend to ordinary text. Use text-tertiary for low-emphasis copy that is still readable.`,
    )
  }

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
      `${r.token} is not part of this palette, but ${r.measures.join(", ")} ${r.measures.length === 1 ? "was" : "were"} measured against it (${r.light} light / ${r.dark} dark). If you use a different background behind those, re-check the contrast yourself — the WCAG ${state.compliance} claim above only holds against these values.`,
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
          step: {
            light: `${t.light.ramp}-${t.light.step}`,
            dark: `${t.dark.ramp}-${t.dark.step}`,
          },
          ...(t.pairWith && t.lightRatio !== undefined && t.darkRatio !== undefined
            ? {
                contrast: {
                  against: t.pairWith,
                  light: round2(t.lightRatio),
                  dark: round2(t.darkRatio),
                },
              }
            : {}),
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
  lines.push("", "SEMANTIC TOKENS (token · light · dark · ramp step · contrast · role)")
  // Grouped rather than emitted in declaration order: the inverse tokens are
  // declared last but belong to the Background and Text categories, which in
  // source order would print those two headers a second time. Anything parsing
  // this into a dict keyed by group would drop the first of each pair.
  const byCategory = new Map<string, typeof tokens>()
  for (const t of tokens) {
    const group = byCategory.get(t.category)
    if (group) group.push(t)
    else byCategory.set(t.category, [t])
  }
  for (const [category, group] of byCategory) {
    lines.push(`  [${category}]`)
    for (const t of group) {
      // The step is what lets a reader extend the system consistently — it says
      // which rung of which ramp a token came from, not just its value. Both
      // modes are shown ("neutral-900/100") since the resolver moves them
      // independently; the ramp is always the same in each.
      const step =
        t.light.step === t.dark.step
          ? `${t.light.ramp}-${t.light.step}`
          : `${t.light.ramp}-${t.light.step}/${t.dark.step}`
      const ratios =
        t.pairWith && t.lightRatio !== undefined && t.darkRatio !== undefined
          ? `${round2(t.lightRatio)}:1/${round2(t.darkRatio)}:1 vs ${t.pairWith}`
          : "—"
      lines.push(
        `    ${t.token.padEnd(20)} ${t.lightHex}  ${t.darkHex}  ${step.padEnd(18)} ${ratios.padEnd(30)} ${t.role}`,
      )
    }
  }
  lines.push("", "NOTES")
  for (const n of notes) lines.push(`  - ${n}`)
  // The URL contract, spelled out rather than linked. This is the only place a
  // cold-start reader — one that was told the tool's name but handed no link —
  // can learn how to ask for a palette of its own.
  lines.push(
    "",
    "REGENERATE WITH DIFFERENT INPUTS",
    `  ${origin}/?b=<brand hex, no #>&m=<scope>&s=<scheme>&c=<wcag>`,
    "",
    "    b   brand color, 6-digit hex without the leading # (required; defaults to 3d7dff)",
    "    a   pin the secondary accent, hex without # (optional; derived from the scheme otherwise)",
    "    a2  pin the tertiary accent, hex without # (optional; derived otherwise)",
    "    m   scope: full | basic                                    (default full)",
    "    s   scheme: complementary | analogous | triadic | split | monochromatic (default complementary)",
    "    c   WCAG target: AA | AAA                                  (default AA)",
    "    f   notation: oklch | hex | rgb | hsl                      (default oklch)",
    "    xr  ramps to omit, dot-separated names, e.g. xr=accent-2.info",
    "    xt  tokens to omit, dot-separated names, e.g. xt=bg-info.text-info",
    "",
    `  Same palette as JSON: ${origin}/api/palette?b=<brand hex, no #>`,
    `  Full machine-readable contract, including every token name: ${origin}/llms.txt`,
  )

  return { state, json, text: lines.join("\n") }
}
