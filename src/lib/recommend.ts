// ==============================================
// RECOMMENDATIONS
// Decides *which* colors to generate, where
// color.ts decides how. Rotates the brand hue by the
// chosen scheme to derive accents, anchors the
// status colors at conventional hues, and pushes any
// status hue that lands too close to a palette hue
// out of the way — so "error" never reads as
// "brand". `buildPalette` assembles the whole set.
// ==============================================
import { buildRamp, buildNeutralRamp, toOklch, getSwatch, type Ramp } from "./color.js"

export type DsMode = "full" | "basic"

export type Palette = {
  primaries: Ramp[]
  accents: Ramp[]
  neutral: Ramp
  status: Ramp[]
}

// Semantic anchor hues (OKLCH degrees) for functional status colors.
const STATUS_HUES = {
  success: 150,
  warning: 85,
  error: 27,
  info: 255,
}

function rotate(hue: number, deg: number): number {
  return (((hue + deg) % 360) + 360) % 360
}

/** Smallest signed angular distance from `a` to `b`, in [-180, 180]. */
function hueDelta(a: number, b: number): number {
  return ((((b - a) % 360) + 540) % 360) - 180
}

/**
 * Keep a status hue clear of the palette's own hues. If `hue` sits within
 * `guard` degrees of any occupied hue, push it away from the nearest one just
 * past the guard band — enough to stay distinct without abandoning convention.
 */
function avoidCollision(hue: number, occupied: number[], guard = 18): number {
  let result = hue
  for (const occ of occupied) {
    const delta = hueDelta(result, occ)
    if (Math.abs(delta) < guard) {
      // Move opposite the occupied hue (delta points toward it).
      result = rotate(result, delta >= 0 ? -(guard - delta) : guard + delta)
    }
  }
  return result
}

/** OKLCH components of a hex, with sane fallbacks for unparseable input. */
function baseComponents(hex: string): { hue: number; chroma: number } {
  const c = toOklch(hex)
  return { hue: c?.h ?? 250, chroma: c?.c ?? 0.15 }
}

/**
 * A derivation scheme (a "vibe") governs how downstream colors are rotated off
 * the brand hue, how tinted the neutral gray is, and how vivid status colors read.
 */
export type Scheme = "complementary" | "analogous" | "triadic" | "split" | "monochromatic"

type SchemeSpec = {
  accent: number // hue rotation for the accent
  tertiary: number // hue rotation for the tertiary
  neutralTint: number // chroma of the neutral gray
  statusMul: number // multiplier on status chroma
}

const SCHEME_SPECS: Record<Scheme, SchemeSpec> = {
  complementary: { accent: 180, tertiary: -35, neutralTint: 0.008, statusMul: 1.0 },
  analogous: { accent: 32, tertiary: -32, neutralTint: 0.006, statusMul: 0.92 },
  triadic: { accent: 120, tertiary: 240, neutralTint: 0.008, statusMul: 1.06 },
  split: { accent: 155, tertiary: 205, neutralTint: 0.008, statusMul: 1.0 },
  monochromatic: { accent: 14, tertiary: -14, neutralTint: 0.014, statusMul: 0.82 },
}

/** Dropdown metadata for the derivation schemes, in display order. */
export const SCHEMES: { id: Scheme; label: string; blurb: string }[] = [
  {
    id: "complementary",
    label: "Complementary",
    blurb: "Accent opposite the brand — punchy, confident.",
  },
  { id: "analogous", label: "Analogous", blurb: "Neighbouring hues — calm, cohesive." },
  { id: "triadic", label: "Triadic", blurb: "Evenly spaced hues — playful, balanced." },
  {
    id: "split",
    label: "Split complementary",
    blurb: "The complement's neighbours — bold, less tension.",
  },
  {
    id: "monochromatic",
    label: "Monochromatic",
    blurb: "Stays near the brand — quiet, unified.",
  },
]

/**
 * The auto-derived accent for a brand color under a given scheme, expressed as a
 * hex seed. Used as the default until the user locks an override.
 */
export function deriveAccentHex(brand: string, scheme: Scheme = "complementary"): string {
  const { hue, chroma } = baseComponents(brand)
  return hexFromHue(rotate(hue, SCHEME_SPECS[scheme].accent), chroma, 0.637)
}

/** The auto-derived tertiary accent, on the same terms as `deriveAccentHex`. */
export function deriveAccent2Hex(brand: string, scheme: Scheme = "complementary"): string {
  const { hue, chroma } = baseComponents(brand)
  return hexFromHue(rotate(hue, SCHEME_SPECS[scheme].tertiary), chroma, 0.637)
}

/**
 * Derive a full palette from a brand color, an optional accent override, and a
 * derivation scheme.
 * - accents (full mode only): the accent (override or scheme-derived) + a
 *   tertiary rotated off the brand hue per the scheme
 * - neutral: near-gray ramp tinted with the brand hue, tint set by the scheme
 * - status: success/warning/error/info at fixed semantic hues, chroma tuned
 *   toward the palette's saturation and the scheme's vividness.
 */
export function buildPalette(
  brand: string,
  accentOverride: string | null,
  mode: DsMode,
  scheme: Scheme = "complementary",
  accent2Override: string | null = null,
): Palette {
  const spec = SCHEME_SPECS[scheme]
  const brandRamp = buildRamp("primary", brand)
  const primaries = brandRamp ? [brandRamp] : []

  const { hue: baseHue, chroma: baseChroma } = baseComponents(brand)
  const accentHex = accentOverride ?? deriveAccentHex(brand, scheme)

  // Accents: the (possibly locked) accent + a scheme-rotated tertiary.
  const accents: Ramp[] =
    mode === "full"
      ? [
          buildRamp("accent", accentHex),
          buildRamp("accent-2", accent2Override ?? deriveAccent2Hex(brand, scheme)),
        ].filter((r): r is Ramp => r !== null)
      : []

  const neutral = buildNeutralRamp("neutral", baseHue, spec.neutralTint)

  // Status chroma: blend a sensible floor with the palette's own saturation,
  // scaled by the scheme's vividness.
  const statusChroma = Math.min(0.18, Math.max(0.09, baseChroma * 0.9 * spec.statusMul))

  // Hues occupied by the palette itself. If a status color would collide with
  // the brand or accent, nudge it just far enough away to stay distinct — while
  // keeping it recognisably conventional (red=error, green=success, etc.).
  const paletteHues = [baseHue, baseComponents(accentHex).hue]
  const status: Ramp[] = (Object.keys(STATUS_HUES) as (keyof typeof STATUS_HUES)[])
    .map((name) => {
      const hue = avoidCollision(STATUS_HUES[name], paletteHues)
      return buildRamp(name, hexFromHue(hue, statusChroma, 0.637))
    })
    .filter((r): r is Ramp => r !== null)

  return { primaries, accents, neutral, status }
}

// Build a hex seed directly from OKLCH components via a throwaway ramp lookup.
function hexFromHue(hue: number, chroma: number, lightness: number): string {
  const ramp = buildRamp(
    "seed",
    `oklch(${(lightness * 100).toFixed(1)}% ${chroma.toFixed(3)} ${hue.toFixed(1)})`,
  )
  return ramp ? getSwatch(ramp, 500).hex : "#808080"
}
