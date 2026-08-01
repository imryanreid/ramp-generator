// ==============================================
// SEMANTIC TOKENS & EXPORTERS
// Maps ramp steps onto usage-first token names
// (surface, border, text, interactive states),
// resolved separately for light and dark, then
// serializes them: toCss, toTailwind, toFigma (W3C
// DTCG, one file per mode), and toJson.
//
// These exporters are the canonical output format —
// the export modal and the agent-readable block on
// the page both render from them. Don't add a
// fourth serialization elsewhere.
// ==============================================
import { STEPS, getSwatch, contrast, hexToSrgbComponents, toOklch, type Ramp, type Step } from "./color"
import type { Palette } from "./recommend"

export type DsMode = "full" | "basic"

/** A semantic token resolves to a specific ramp + step in light and dark. */
export type TokenDef = {
  token: string
  role: string
  category: string
  light: { ramp: string; step: Step }
  dark: { ramp: string; step: Step }
  // Optional pairing to check contrast against (another token) for an AA badge.
  pairWith?: string
  // When true, the token is only emitted in "full" DS mode.
  full?: boolean
}

export type ResolvedToken = TokenDef & {
  lightHex: string
  darkHex: string
  lightRatio?: number
  darkRatio?: number
}

const PRIMARY = "primary"

// Concise builder so the contract below reads as a table.
type Loc = [ramp: string, step: Step]
function t(
  token: string,
  role: string,
  category: string,
  light: Loc,
  dark: Loc,
  opts: { pairWith?: string; full?: boolean } = {},
): TokenDef {
  return {
    token,
    role,
    category,
    light: { ramp: light[0], step: light[1] },
    dark: { ramp: dark[0], step: dark[1] },
    ...opts,
  }
}

const BG = "Background"
const TEXT = "Text"
const BORDER = "Border"
const FOCUS = "Focus"

// The semantic contract, organized by usage. Neutral carries surfaces/text/
// borders; primary carries action; accent + accent-2 are secondary/tertiary;
// status ramps carry feedback. Interactive fills expose hover/active states.
// Tokens flagged `full` only ship in Full DS mode.
const TOKENS: TokenDef[] = [
  // ---- Backgrounds: surfaces ----
  t("bg-canvas", "Page background", BG, ["neutral", 100], ["neutral", 950]),
  t("bg-surface", "Card / panel", BG, ["neutral", 50], ["neutral", 900]),
  t("bg-surface-raised", "Popover / dropdown", BG, ["neutral", 50], ["neutral", 800], { full: true }),
  t("bg-muted", "Subtle fill / hover", BG, ["neutral", 100], ["neutral", 800]),

  // ---- Backgrounds: action fills ----
  t("bg-brand", "Brand action", BG, [PRIMARY, 600], [PRIMARY, 500]),
  t("bg-brand-hover", "Brand — hover", BG, [PRIMARY, 700], [PRIMARY, 400]),
  t("bg-brand-active", "Brand — pressed", BG, [PRIMARY, 800], [PRIMARY, 300], { full: true }),
  t("bg-accent", "Accent action", BG, ["accent", 600], ["accent", 500], { full: true }),
  t("bg-accent-hover", "Accent — hover", BG, ["accent", 700], ["accent", 400], { full: true }),
  t("bg-accent-active", "Accent — pressed", BG, ["accent", 800], ["accent", 300], { full: true }),
  t("bg-tertiary", "Tertiary action", BG, ["accent-2", 600], ["accent-2", 500], { full: true }),
  t("bg-tertiary-hover", "Tertiary — hover", BG, ["accent-2", 700], ["accent-2", 400], { full: true }),

  // ---- Backgrounds: feedback ----
  t("bg-success", "Success fill", BG, ["success", 600], ["success", 500]),
  t("bg-success-subtle", "Success surface", BG, ["success", 100], ["success", 900], { full: true }),
  t("bg-warning", "Warning fill", BG, ["warning", 500], ["warning", 400]),
  t("bg-warning-subtle", "Warning surface", BG, ["warning", 100], ["warning", 900], { full: true }),
  t("bg-error", "Error fill", BG, ["error", 600], ["error", 500]),
  t("bg-error-subtle", "Error surface", BG, ["error", 100], ["error", 900], { full: true }),
  t("bg-info", "Info fill", BG, ["info", 600], ["info", 500], { full: true }),
  t("bg-info-subtle", "Info surface", BG, ["info", 100], ["info", 900], { full: true }),

  // ---- Text ----
  t("text-primary", "Primary text", TEXT, ["neutral", 900], ["neutral", 100], { pairWith: "bg-canvas" }),
  t("text-secondary", "Secondary text", TEXT, ["neutral", 600], ["neutral", 400], { pairWith: "bg-canvas" }),
  t("text-tertiary", "Tertiary / captions", TEXT, ["neutral", 500], ["neutral", 500], { pairWith: "bg-canvas", full: true }),
  t("text-disabled", "Disabled text", TEXT, ["neutral", 400], ["neutral", 600], { full: true }),
  t("text-link", "Hyperlink", TEXT, [PRIMARY, 600], [PRIMARY, 400], { pairWith: "bg-canvas" }),
  t("text-on-brand", "Text on brand", TEXT, [PRIMARY, 50], [PRIMARY, 950], { pairWith: "bg-brand" }),
  t("text-on-accent", "Text on accent", TEXT, ["accent", 50], ["accent", 950], { pairWith: "bg-accent", full: true }),
  t("text-success", "Success text", TEXT, ["success", 700], ["success", 400], { pairWith: "bg-canvas", full: true }),
  t("text-error", "Error text", TEXT, ["error", 700], ["error", 400], { pairWith: "bg-canvas" }),
  t("text-warning", "Warning text", TEXT, ["warning", 700], ["warning", 400], { pairWith: "bg-canvas", full: true }),
  t("text-info", "Info text", TEXT, ["info", 700], ["info", 400], { pairWith: "bg-canvas", full: true }),

  // ---- Borders ----
  t("border-subtle", "Hairline rule", BORDER, ["neutral", 200], ["neutral", 800]),
  t("border-default", "Default border", BORDER, ["neutral", 300], ["neutral", 700]),
  t("border-strong", "Emphasis border", BORDER, ["neutral", 400], ["neutral", 600], { full: true }),
  t("border-active", "Selected / active", BORDER, [PRIMARY, 600], [PRIMARY, 500]),
  t("border-error", "Invalid input", BORDER, ["error", 500], ["error", 500], { full: true }),

  // ---- Focus ----
  t("ring-focus", "Focus ring", FOCUS, [PRIMARY, 500], [PRIMARY, 400]),
]

/** The tokens emitted for a given DS mode (basic drops `full`-only tokens). */
export function tokensForMode(mode: DsMode): TokenDef[] {
  return mode === "full" ? TOKENS : TOKENS.filter((t) => !t.full)
}

/** Flatten a palette into a name→ramp lookup, mapping the first primary/accent. */
export function rampIndex(palette: Palette): Record<string, Ramp> {
  const index: Record<string, Ramp> = {}
  for (const r of palette.primaries) index[r.name] = r
  if (palette.primaries[0]) index[PRIMARY] = palette.primaries[0]
  for (const r of palette.accents) index[r.name] = r
  if (palette.accents[0]) index["accent"] = palette.accents[0]
  index["neutral"] = palette.neutral
  for (const r of palette.status) index[r.name] = r
  return index
}

function hexAt(index: Record<string, Ramp>, ramp: string, step: Step, fallback = "neutral"): string {
  const r = index[ramp] ?? index[fallback]
  return r ? getSwatch(r, step).hex : "#808080"
}

// ---------- Contrast compliance ----------

export type Compliance = "AA" | "AAA"

/** WCAG 2.1 contrast minimums for normal-size text. */
export const CONTRAST_TARGET: Record<Compliance, number> = { AA: 4.5, AAA: 7 }

/**
 * Backgrounds that define the page's character. These are never moved to chase
 * a contrast target — repainting the canvas to fix one label would change the
 * whole design. Action fills (bg-brand, bg-accent, …) may move.
 */
const FIXED_BACKGROUNDS = new Set([
  "bg-canvas",
  "bg-surface",
  "bg-surface-raised",
  "bg-muted",
])

/**
 * When an action fill moves, its hover/active siblings move by the same number
 * of steps, so the interaction ladder keeps its order and spacing.
 */
const FILL_FAMILY: Record<string, string[]> = {
  "bg-brand": ["bg-brand", "bg-brand-hover", "bg-brand-active"],
  "bg-accent": ["bg-accent", "bg-accent-hover", "bg-accent-active"],
}

const STEP_INDEX = new Map<Step, number>(STEPS.map((s, i) => [s, i]))
const stepAt = (i: number): Step => STEPS[Math.max(0, Math.min(STEPS.length - 1, i))]

/** Every step, ordered by distance from `from` — so fixes stay near the authored value. */
function stepsByProximity(from: Step): Step[] {
  const origin = STEP_INDEX.get(from) ?? 0
  return [...STEPS].sort(
    (a, b) =>
      Math.abs((STEP_INDEX.get(a) ?? 0) - origin) -
      Math.abs((STEP_INDEX.get(b) ?? 0) - origin),
  )
}

type Placement = { ramp: string; step: Step }
type Working = { light: Placement; dark: Placement }

/** Move an action fill to `newStep`, carrying its hover/active siblings along. */
function shiftFamily(
  place: Record<string, Working>,
  anchor: string,
  colorMode: "light" | "dark",
  newStep: Step,
) {
  const current = place[anchor]?.[colorMode]
  if (!current) return
  const delta = (STEP_INDEX.get(newStep) ?? 0) - (STEP_INDEX.get(current.step) ?? 0)
  if (delta === 0) return
  for (const sibling of FILL_FAMILY[anchor] ?? [anchor]) {
    const p = place[sibling]?.[colorMode]
    if (!p) continue
    p.step = stepAt((STEP_INDEX.get(p.step) ?? 0) + delta)
  }
}

/**
 * Resolve the token contract against a palette, nudging steps as needed so every
 * paired foreground clears the selected WCAG target.
 *
 * The search is deliberately conservative, in three stages:
 *   1. Move the foreground alone, to the step nearest its authored value that
 *      clears the bar. Most pairs are fixed here.
 *   2. If the foreground runs out of ramp, move the background too — but only
 *      when it's an action fill, never a page surface.
 *   3. If nothing reaches the target, take the highest contrast available and
 *      let the badge report the shortfall honestly rather than faking a pass.
 */
export function resolveTokens(
  palette: Palette,
  mode: DsMode = "full",
  compliance: Compliance = "AA",
): ResolvedToken[] {
  const index = rampIndex(palette)
  const defs = tokensForMode(mode)
  const target = CONTRAST_TARGET[compliance]

  // Working placements, seeded from the static contract and nudged below.
  const place: Record<string, Working> = {}
  for (const d of defs) place[d.token] = { light: { ...d.light }, dark: { ...d.dark } }

  const hexOf = (p: Placement) => hexAt(index, p.ramp, p.step)

  for (const d of defs) {
    if (!d.pairWith) continue
    const background = place[d.pairWith]
    if (!background) continue

    for (const colorMode of ["light", "dark"] as const) {
      const fg = place[d.token][colorMode]
      const bg = background[colorMode]
      if (contrast(hexOf(fg), hexOf(bg)) >= target) continue

      const nearestFirst = stepsByProximity(fg.step)

      // 1. Foreground only.
      const fgFix = nearestFirst.find(
        (s) => contrast(hexAt(index, fg.ramp, s), hexOf(bg)) >= target,
      )
      if (fgFix !== undefined) {
        fg.step = fgFix
        continue
      }

      // 2. Foreground is maxed out — move the fill, if it's allowed to move.
      //    Score every workable (fill, foreground) pair by how far *both* have
      //    travelled from their authored steps and take the cheapest. Ranking on
      //    the fill alone would let a tie be broken arbitrarily: a brand button
      //    could lighten by one step and flip its label from light to dark,
      //    when darkening by one step keeps the authored light label.
      if (!FIXED_BACKGROUNDS.has(d.pairWith)) {
        const fgOrigin = STEP_INDEX.get(fg.step) ?? 0
        const bgOrigin = STEP_INDEX.get(bg.step) ?? 0
        let bestPair: { bgStep: Step; fgStep: Step; cost: number } | null = null

        for (const bgStep of STEPS) {
          const bgHex = hexAt(index, bg.ramp, bgStep)
          const bgCost = Math.abs((STEP_INDEX.get(bgStep) ?? 0) - bgOrigin)
          if (bestPair && bgCost >= bestPair.cost) continue
          for (const fgStep of nearestFirst) {
            if (contrast(hexAt(index, fg.ramp, fgStep), bgHex) < target) continue
            const cost = bgCost + Math.abs((STEP_INDEX.get(fgStep) ?? 0) - fgOrigin)
            if (!bestPair || cost < bestPair.cost) bestPair = { bgStep, fgStep, cost }
            break // nearestFirst is sorted, so this is the cheapest fg for this fill
          }
        }

        if (bestPair) {
          shiftFamily(place, d.pairWith, colorMode, bestPair.bgStep)
          fg.step = bestPair.fgStep
          continue
        }
      }

      // 3. Unreachable — settle for the best contrast this ramp can offer.
      let best = fg.step
      let bestRatio = -1
      for (const s of STEPS) {
        const ratio = contrast(hexAt(index, fg.ramp, s), hexOf(bg))
        if (ratio > bestRatio) {
          bestRatio = ratio
          best = s
        }
      }
      fg.step = best
    }
  }

  const hexes: Record<string, { light: string; dark: string }> = {}
  const resolved: ResolvedToken[] = defs.map((d) => {
    const p = place[d.token]
    const lightHex = hexOf(p.light)
    const darkHex = hexOf(p.dark)
    hexes[d.token] = { light: lightHex, dark: darkHex }
    return { ...d, light: p.light, dark: p.dark, lightHex, darkHex }
  })

  // Final pass: contrast ratios, now that every placement has settled.
  return resolved.map((t) => {
    if (!t.pairWith) return t
    const against = hexes[t.pairWith]
    if (!against) return t
    return {
      ...t,
      lightRatio: contrast(t.lightHex, against.light),
      darkRatio: contrast(t.darkHex, against.dark),
    }
  })
}

// ---------- Exporters ----------

/** All ramps as flat name/step pairs, in display order. */
function allRamps(palette: Palette): Ramp[] {
  return [
    ...palette.primaries,
    ...palette.accents,
    palette.neutral,
    ...palette.status,
  ]
}

export function toCss(
  palette: Palette,
  mode: DsMode = "full",
  compliance: Compliance = "AA",
): string {
  const ramps = allRamps(palette)
  const tokens = resolveTokens(palette, mode, compliance)
  const rampLines = ramps.flatMap((r) =>
    STEPS.map((s) => `  --${r.name}-${s}: ${getSwatch(r, s).hex};`),
  )
  const lightSem = tokens.map((t) => `  --color-${t.token}: ${t.lightHex};`)
  const darkSem = tokens.map((t) => `  --color-${t.token}: ${t.darkHex};`)
  return [
    ":root {",
    "  /* Ramps */",
    ...rampLines,
    "",
    "  /* Semantic tokens */",
    ...lightSem,
    "}",
    "",
    ".dark {",
    ...darkSem,
    "}",
  ].join("\n")
}

export function toTailwind(
  palette: Palette,
  mode: DsMode = "full",
  compliance: Compliance = "AA",
): string {
  const ramps = allRamps(palette)
  const rampLines = ramps.flatMap((r) =>
    STEPS.map((s) => `  --color-${r.name}-${s}: ${getSwatch(r, s).hex};`),
  )
  const tokens = resolveTokens(palette, mode, compliance)
  const semLines = tokens.map((t) => `  --color-${t.token}: ${t.lightHex};`)
  return ["@theme {", ...rampLines, "", ...semLines, "}"].join("\n")
}

/**
 * Figma variables as flat, single-mode W3C DTCG JSON — nested token groups whose
 * leaves are `{ $type, $value }`. Figma variable-import plugins parse one
 * collection + one mode per file (the DTCG spec has no concept of modes), so
 * each file carries a single color mode; export Light and Dark separately and
 * import each as its own mode. Ramps become groups (`brand`, `neutral`, …) and
 * semantic tokens live under a `semantic` group.
 */
// Current W3C DTCG structured color value — what Figma's native import expects.
// A plain hex string is rejected as `invalid-design-token`.
type FigmaColorToken = {
  $type: "color"
  $value: { colorSpace: "srgb"; components: [number, number, number]; alpha: number; hex: string }
}

function figmaColor(hex: string): FigmaColorToken {
  return {
    $type: "color",
    $value: { colorSpace: "srgb", components: hexToSrgbComponents(hex), alpha: 1, hex },
  }
}

// Perceptual color names by nearest OKLCH hue center; near-zero chroma → neutral.
const HUE_NAMES: { hue: number; name: string }[] = [
  { hue: 27, name: "Red" },
  { hue: 60, name: "Orange" },
  { hue: 95, name: "Yellow" },
  { hue: 130, name: "Lime" },
  { hue: 150, name: "Green" },
  { hue: 190, name: "Teal" },
  { hue: 230, name: "Cyan" },
  { hue: 262, name: "Blue" },
  { hue: 300, name: "Purple" },
  { hue: 330, name: "Magenta" },
  { hue: 350, name: "Pink" },
]

/** A human color name for a ramp, derived from its mid-step (500) OKLCH hue. */
function colorName(ramp: Ramp): string {
  const c = toOklch(getSwatch(ramp, 500).hex)
  if (!c || (c.c ?? 0) < 0.03) return "Neutral"
  const h = c.h ?? 0
  let best = HUE_NAMES[0]
  let min = Infinity
  for (const cand of HUE_NAMES) {
    const d = Math.abs((((h - cand.hue) % 360) + 540) % 360) - 180
    if (Math.abs(d) < min) {
      min = Math.abs(d)
      best = cand
    }
  }
  return best.name
}

// Friendly role labels used to disambiguate ramps that share a color name.
const ROLE_LABELS: Record<string, string> = {
  primary: "Brand",
  accent: "Accent",
  "accent-2": "Accent 2",
  neutral: "Neutral",
  success: "Success",
  warning: "Warning",
  error: "Error",
  info: "Info",
}

/**
 * Map each ramp's internal name (primary, accent, success…) to a unique color
 * name. When two ramps land on the same color (e.g. a blue brand and blue info),
 * the first keeps the clean name and the rest are qualified by role — "Blue",
 * "Blue Info" — so groups stay clear and guaranteed-distinct.
 */
export function rampNameMap(palette: Palette): Record<string, string> {
  const ramps = allRamps(palette)
  const counts = new Map<string, number>()
  for (const r of ramps) counts.set(colorName(r), (counts.get(colorName(r)) ?? 0) + 1)

  const used = new Set<string>()
  const map: Record<string, string> = {}
  for (const r of ramps) {
    const base = colorName(r)
    let name = base
    if ((counts.get(base) ?? 0) > 1 && used.has(base)) {
      const label = ROLE_LABELS[r.name] ?? r.name
      name = `${base} ${label}`
      // Extremely defensive: fall back to a numeric suffix if still taken.
      let n = 2
      while (used.has(name)) name = `${base} ${label} ${n++}`
    }
    used.add(name)
    map[r.name] = name
  }
  return map
}

/**
 * Friendly display name for each ramp *alias* the semantic tokens reference
 * ("primary", "accent", "neutral", "success"…) → e.g. "Blue", "Neutral". Mirrors
 * `rampNameMap`'s color-naming + collision handling but keyed by the aliases the
 * token table actually uses, so the UI can show "Blue 600" instead of a hex.
 */
export function rampAliasNames(palette: Palette): Record<string, string> {
  const index = rampIndex(palette)
  const aliases = ["primary", "accent", "accent-2", "neutral", "success", "warning", "error", "info"]
  const present = aliases.filter((a) => index[a])

  const counts = new Map<string, number>()
  for (const a of present) counts.set(colorName(index[a]), (counts.get(colorName(index[a])) ?? 0) + 1)

  const used = new Set<string>()
  const map: Record<string, string> = {}
  for (const a of present) {
    const base = colorName(index[a])
    let name = base
    if ((counts.get(base) ?? 0) > 1 && used.has(base)) {
      const label = ROLE_LABELS[a] ?? a
      name = `${base} ${label}`
      let n = 2
      while (used.has(name)) name = `${base} ${label} ${n++}`
    }
    used.add(name)
    map[a] = name
  }
  return map
}

type FigmaAliasToken = { $type: "color"; $value: string }

const RAMPS_GROUP = "Ramps"
const SEMANTICS_GROUP = "Semantics"

export function toFigma(
  palette: Palette,
  mode: DsMode = "full",
  colorMode: "light" | "dark" = "light",
  compliance: Compliance = "AA",
): string {
  const names = rampNameMap(palette)
  const ramps: Record<string, Record<string, FigmaColorToken>> = {}
  const semantics: Record<string, Record<string, FigmaAliasToken>> = {}

  // Ramp groups, named by color so Figma's variable groups read clearly.
  for (const r of allRamps(palette)) {
    const scale: Record<string, FigmaColorToken> = {}
    for (const s of STEPS) {
      scale[String(s)] = figmaColor(getSwatch(r, s).hex)
    }
    ramps[names[r.name]] = scale
  }

  // Semantic tokens, grouped by usage type and aliased to the ramp steps above.
  for (const t of resolveTokens(palette, mode, compliance)) {
    const loc = colorMode === "dark" ? t.dark : t.light
    const group = names[loc.ramp] ? loc.ramp : "neutral"
    const alias: FigmaAliasToken = {
      $type: "color",
      $value: `{${RAMPS_GROUP}.${names[group]}.${loc.step}}`,
    }
    ;(semantics[t.category] ??= {})[t.token] = alias
  }

  return JSON.stringify({ [RAMPS_GROUP]: ramps, [SEMANTICS_GROUP]: semantics }, null, 2)
}

export function toJson(
  palette: Palette,
  mode: DsMode = "full",
  compliance: Compliance = "AA",
): string {
  const ramps = allRamps(palette)
  const out: Record<string, unknown> = {}
  for (const r of ramps) {
    const scale: Record<string, { $value: string; $type: string }> = {}
    for (const s of STEPS) {
      scale[String(s)] = { $value: getSwatch(r, s).hex, $type: "color" }
    }
    out[r.name] = scale
  }
  const semantic: Record<string, { $value: string; $type: string }> = {}
  for (const t of resolveTokens(palette, mode, compliance)) {
    semantic[t.token] = { $value: t.lightHex, $type: "color" }
  }
  out.semantic = semantic
  return JSON.stringify(out, null, 2)
}
