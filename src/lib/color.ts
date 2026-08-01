// ==============================================
// COLOR ENGINE
// The math. Converts a hex to OKLCH and builds an
// 11-step ramp (50–950) from it, using a fixed
// lightness curve plus a bell-curve chroma
// multiplier so the lightest and darkest steps
// desaturate the way hand-tuned ramps do. Every
// result is clamped back into the sRGB gamut.
//
// Also builds the brand-tinted neutral ramp and the
// contrast helpers that decide whether a swatch
// label should be light or dark.
// ==============================================
import {
  oklch,
  rgb,
  formatHex,
  parse,
  clampChroma,
  wcagContrast,
  wcagLuminance,
} from "culori"

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
export type Step = (typeof STEPS)[number]

// OKLCH lightness targets per step, tuned to feel like Tailwind's ramps.
const LIGHTNESS: Record<Step, number> = {
  50: 0.972,
  100: 0.94,
  200: 0.885,
  300: 0.808,
  400: 0.712,
  500: 0.637,
  600: 0.558,
  700: 0.475,
  800: 0.397,
  900: 0.322,
  950: 0.235,
}

// Chroma multiplier per step: a bell curve peaking in the mid-tones so the
// lightest and darkest steps desaturate the way hand-tuned ramps do.
const CHROMA_CURVE: Record<Step, number> = {
  50: 0.28,
  100: 0.42,
  200: 0.62,
  300: 0.82,
  400: 0.96,
  500: 1.0,
  600: 0.98,
  700: 0.92,
  800: 0.82,
  900: 0.7,
  950: 0.58,
}

export type OklchColor = { l: number; c: number; h: number }

export type Swatch = {
  step: Step
  hex: string
  oklch: string
  isSource: boolean
}

export type Ramp = {
  name: string
  swatches: Swatch[]
  sourceStep: Step
}

/** Parse any CSS color string into OKLCH. Returns null if unparseable. */
export function toOklch(input: string): OklchColor | null {
  const parsed = parse(input)
  if (!parsed) return null
  const o = oklch(parsed)
  if (!o) return null
  return { l: o.l ?? 0, c: o.c ?? 0, h: o.h ?? 0 }
}

export function isValidColor(input: string): boolean {
  return parse(input) !== undefined
}

/**
 * Normalized sRGB components (0–1) for a hex color, for the current W3C DTCG
 * structured color value that Figma's native variable import expects.
 */
export function hexToSrgbComponents(hex: string): [number, number, number] {
  const c = rgb(parse(hex))
  const round = (n: number | undefined) => Math.round((n ?? 0) * 100000) / 100000
  return [round(c?.r), round(c?.g), round(c?.b)]
}

/** Normalize loose hex input ("#abc", "abc", "aabbcc") to a full hex, or null. */
export function normalizeHex(input: string): string | null {
  const trimmed = input.trim()
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`
  const parsed = parse(withHash)
  if (!parsed) return null
  return formatHex(parsed)
}

function oklchToHex(l: number, c: number, h: number): string {
  // Clamp chroma so the color stays inside the sRGB gamut instead of clipping.
  const inGamut = clampChroma({ mode: "oklch", l, c, h }, "oklch")
  return formatHex(inGamut) ?? "#000000"
}

function oklchString(l: number, c: number, h: number): string {
  return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`
}

function nearestStep(l: number): Step {
  let best: Step = 500
  let bestDiff = Infinity
  for (const step of STEPS) {
    const diff = Math.abs(LIGHTNESS[step] - l)
    if (diff < bestDiff) {
      bestDiff = diff
      best = step
    }
  }
  return best
}

/**
 * Build an 11-step ramp from a base color. Keeps the base hue, walks lightness
 * along fixed targets, and scales chroma by a bell curve relative to the base's
 * own chroma so vivid inputs stay vivid and muted inputs stay muted.
 */
export function buildRamp(name: string, baseInput: string): Ramp | null {
  const base = toOklch(baseInput)
  if (!base) return null

  const sourceStep = nearestStep(base.l)
  // Reference chroma at the peak of the curve, derived from the base color.
  const peakChroma = base.c / (CHROMA_CURVE[sourceStep] || 1)

  const swatches: Swatch[] = STEPS.map((step) => {
    const l = LIGHTNESS[step]
    const c = Math.max(0, peakChroma * CHROMA_CURVE[step])
    const h = base.h
    return {
      step,
      hex: oklchToHex(l, c, h),
      oklch: oklchString(l, c, h),
      isSource: step === sourceStep,
    }
  })

  return { name, swatches, sourceStep }
}

/** Build a low-chroma neutral ramp that carries a hint of the given hue. */
export function buildNeutralRamp(name: string, hue: number, tint = 0.008): Ramp {
  const swatches: Swatch[] = STEPS.map((step) => {
    const l = LIGHTNESS[step]
    // A touch more tint in the mid/dark steps reads as a cohesive gray.
    const c = tint * (0.5 + CHROMA_CURVE[step] * 0.8)
    return {
      step,
      hex: oklchToHex(l, c, hue),
      oklch: oklchString(l, c, hue),
      isSource: step === 500,
    }
  })
  return { name, swatches, sourceStep: 500 }
}

export function getSwatch(ramp: Ramp, step: Step): Swatch {
  return ramp.swatches.find((s) => s.step === step) ?? ramp.swatches[5]
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrast(a: string, b: string): number {
  return wcagContrast(a, b)
}

export function passesAA(fg: string, bg: string, large = false): boolean {
  return contrast(fg, bg) >= (large ? 3 : 4.5)
}

/** Pick black or white text for best contrast on a background. */
export function readableText(bg: string): string {
  const lum = wcagLuminance(bg)
  return lum > 0.45 ? "#0a0a0a" : "#ffffff"
}
