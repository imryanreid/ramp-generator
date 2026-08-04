// ==============================================
// CONTRAST RESOLUTION TESTS
// resolveTokens is the subtlest code in the project:
// a three-stage search that walks token steps along
// their ramps until every paired foreground clears
// the selected WCAG target. It can break silently —
// a change to the scoring can leave every pair
// "passing" while flipping a brand button's label
// from light to dark, which looks like a bug and
// isn't caught by anything else.
//
// These assert behaviour rather than specific hexes.
// Pinning exact values would make the tests fail
// every time the lightness curve is tuned, which is
// a legitimate design change; what must not change
// is that the guarantees below keep holding.
// ==============================================
import { describe, it, expect } from "vitest"
import { buildPalette, type Scheme } from "./recommend.js"
import { resolveTokens, CONTRAST_TARGET, type Compliance } from "./semantics.js"
import { contrast, STEPS } from "./color.js"

/** A spread of brands: vivid, muted, dark, near-grey, and a yellow. */
const BRANDS = {
  blue: "#3d7dff", // the default
  orange: "#e4572e",
  green: "#1f7a4d",
  yellow: "#f5c518", // very light at 500 — hardest case for label contrast
  // Fully achromatic. A merely near-grey input still has enough chroma for the
  // rotated hues to resolve to different hexes; at exactly zero there is no hue
  // to rotate, so brand/accent/tertiary land on the same greys.
  grey: "#777777",
} as const

const MODES = ["full", "basic"] as const
const LEVELS: Compliance[] = ["AA", "AAA"]

const paletteFor = (
  brand: string,
  mode: "full" | "basic" = "full",
  scheme: Scheme = "complementary",
) => buildPalette(brand, null, mode, scheme, null)

/** Every (brand × mode × level) combination, as test-case tuples. */
function everyCase() {
  const out: { name: string; brand: string; mode: "full" | "basic"; level: Compliance }[] = []
  for (const [name, brand] of Object.entries(BRANDS)) {
    for (const mode of MODES) {
      for (const level of LEVELS) {
        out.push({ name: `${name}/${mode}/${level}`, brand, mode, level })
      }
    }
  }
  return out
}

describe("resolveTokens — contrast guarantee", () => {
  it.each(everyCase())(
    "$name — every paired foreground either clears the target or reports the shortfall honestly",
    ({ brand, mode, level }) => {
      const tokens = resolveTokens(paletteFor(brand, mode), mode, level)
      const target = CONTRAST_TARGET[level]
      const byToken = new Map(tokens.map((t) => [t.token, t]))

      for (const t of tokens) {
        if (!t.pairWith) continue
        const bg = byToken.get(t.pairWith)
        expect(bg, `${t.token} pairs with ${t.pairWith}, which is missing`).toBeDefined()

        // The reported ratio must be the real, measured one — the whole
        // accessibility claim rests on this, and both the JSON payload and the
        // on-page badge render it verbatim.
        expect(t.lightRatio).toBeCloseTo(contrast(t.lightHex, bg!.lightHex), 5)
        expect(t.darkRatio).toBeCloseTo(contrast(t.darkHex, bg!.darkHex), 5)

        // Stage 3 of the resolver settles for the best available when a ramp
        // genuinely can't reach the target. That's allowed — quietly claiming a
        // pass is not. So a shortfall must be a *real* ceiling: no other step on
        // that ramp may beat what was chosen.
        for (const colorMode of ["light", "dark"] as const) {
          const ratio = colorMode === "light" ? t.lightRatio! : t.darkRatio!
          if (ratio >= target) continue

          const bgHex = colorMode === "light" ? bg!.lightHex : bg!.darkHex
          const loc = colorMode === "light" ? t.light : t.dark
          const rampSteps = tokens
            .filter((o) => o[colorMode].ramp === loc.ramp)
            .map((o) => (colorMode === "light" ? o.lightHex : o.darkHex))
          const best = Math.max(...rampSteps.map((hex) => contrast(hex, bgHex)), ratio)

          expect(
            ratio,
            `${t.token} (${colorMode}) fell short at ${ratio.toFixed(2)}:1 but a better step exists on ${loc.ramp}`,
          ).toBeCloseTo(best, 5)
        }
      }
    },
  )

  it("the default palette at AA clears every pair with no shortfalls", () => {
    const tokens = resolveTokens(paletteFor(BRANDS.blue), "full", "AA")
    const short = tokens.filter(
      (t) =>
        t.pairWith && (t.lightRatio! < CONTRAST_TARGET.AA || t.darkRatio! < CONTRAST_TARGET.AA),
    )
    expect(short.map((t) => t.token)).toEqual([])
  })
})

describe("resolveTokens — what is allowed to move", () => {
  it.each(everyCase())(
    "$name — page surfaces never move from their authored steps",
    ({ brand, mode, level }) => {
      // These define the page's character. Repainting the canvas to rescue one
      // label would change the whole design, so the resolver is forbidden from
      // touching them — only action fills may move.
      //
      // Note what this does and doesn't prove. Emptying FIXED_BACKGROUNDS still
      // leaves this test green, because for every brand tried here stage 1 (move
      // the foreground alone) always succeeds against a neutral surface — the
      // neutral ramp spans L 0.235–0.972, so some step always clears even AAA, and
      // stage 2 never runs. The guard is defensive today. This test locks the
      // *outcome*; if someone narrows the neutral ramp, it starts locking the
      // guard too.
      const AUTHORED: Record<string, { light: number; dark: number }> = {
        "bg-canvas": { light: 100, dark: 950 },
        "bg-surface": { light: 50, dark: 900 },
        "bg-surface-raised": { light: 50, dark: 800 },
        "bg-muted": { light: 200, dark: 700 },
      }
      const tokens = resolveTokens(paletteFor(brand, mode), mode, level)

      for (const t of tokens) {
        const authored = AUTHORED[t.token]
        if (!authored) continue
        expect(t.light.ramp).toBe("neutral")
        expect(t.dark.ramp).toBe("neutral")
        expect(t.light.step, `${t.token} light moved`).toBe(authored.light)
        expect(t.dark.step, `${t.token} dark moved`).toBe(authored.dark)
      }
    },
  )

  it.each(everyCase())(
    "$name — a moved fill keeps its interaction ladder ordered",
    ({ brand, mode, level }) => {
      // When a fill moves to rescue its label, its hover/active siblings move by
      // the same delta. If they didn't, hover could land lighter than rest, or two
      // states could collapse onto one step.
      const LADDERS = [
        ["bg-brand", "bg-brand-hover", "bg-brand-active"],
        ["bg-accent", "bg-accent-hover", "bg-accent-active"],
        ["bg-tertiary", "bg-tertiary-hover"],
      ]
      const tokens = resolveTokens(paletteFor(brand, mode), mode, level)
      const byToken = new Map(tokens.map((t) => [t.token, t]))
      const idx = (step: number) => STEPS.indexOf(step as (typeof STEPS)[number])

      for (const ladder of LADDERS) {
        const present = ladder.map((n) => byToken.get(n)).filter((t) => t !== undefined)
        if (present.length < 2) continue // `basic` mode ships fewer of these

        // Light: rest → hover → active gets darker. Dark: it gets lighter.
        for (let i = 1; i < present.length; i++) {
          const prev = present[i - 1]
          const cur = present[i]
          expect(cur.light.ramp).toBe(prev.light.ramp)
          expect(
            idx(cur.light.step),
            `${cur.token} light is not darker than ${prev.token}`,
          ).toBeGreaterThan(idx(prev.light.step))
          expect(
            idx(cur.dark.step),
            `${cur.token} dark is not lighter than ${prev.token}`,
          ).toBeLessThan(idx(prev.dark.step))
        }
      }
    },
  )

  it("a brand label does not flip light↔dark when a nearer fill would keep it", () => {
    // The regression the combined-travel scoring exists to prevent. Ranking on
    // the background alone lets a tie lighten the fill and invert the label,
    // which passes the ratio check and still looks broken.
    //
    // text-on-brand is authored at primary-50 in light (a light label on a dark
    // fill) and primary-950 in dark. Whatever the resolver does to satisfy the
    // target, it must not cross to the far end of the ramp.
    for (const brand of Object.values(BRANDS)) {
      for (const level of LEVELS) {
        const tokens = resolveTokens(paletteFor(brand), "full", level)
        const label = tokens.find((t) => t.token === "text-on-brand")!
        expect(label.light.ramp).toBe("primary")
        expect(
          label.light.step,
          `${brand}/${level}: light-mode brand label darkened past mid-ramp`,
        ).toBeLessThanOrEqual(500)
        expect(
          label.dark.step,
          `${brand}/${level}: dark-mode brand label lightened past mid-ramp`,
        ).toBeGreaterThanOrEqual(500)
      }
    }
  })
})

describe("resolveTokens — scope and shape", () => {
  it("basic mode is a strict subset of full", () => {
    const full = resolveTokens(paletteFor(BRANDS.blue, "full"), "full", "AA").map(
      (t) => t.token,
    )
    const basic = resolveTokens(paletteFor(BRANDS.blue, "basic"), "basic", "AA").map(
      (t) => t.token,
    )
    expect(basic.length).toBeGreaterThan(0)
    expect(basic.length).toBeLessThan(full.length)
    for (const token of basic) expect(full).toContain(token)
  })

  it("every fill that can carry a label has one", () => {
    // Left unpaired, a consumer reaches for white — which fails AA on roughly
    // half of these, and the right answer inverts between light and dark.
    const tokens = resolveTokens(paletteFor(BRANDS.blue), "full", "AA")
    const names = new Set(tokens.map((t) => t.token))
    for (const fill of [
      "bg-brand",
      "bg-accent",
      "bg-tertiary",
      "bg-success",
      "bg-warning",
      "bg-error",
      "bg-info",
      "bg-inverse",
    ]) {
      const label = fill.replace("bg-", "text-on-").replace("text-on-inverse", "text-inverse")
      expect(names.has(fill) && names.has(label), `${fill} has no paired label`).toBe(true)
      expect(tokens.find((t) => t.token === label)!.pairWith).toBe(fill)
    }
  })

  it("text-disabled is exempt rather than failing", () => {
    // It sits below the minimum on purpose — WCAG exempts disabled controls.
    // Declaring no `pairWith` is what keeps it out of the compliance claim; if
    // it ever gained one, the resolver would drag it up and it would stop
    // reading as disabled.
    const tokens = resolveTokens(paletteFor(BRANDS.blue), "full", "AA")
    const disabled = tokens.find((t) => t.token === "text-disabled")!
    expect(disabled.pairWith).toBeUndefined()
    expect(disabled.lightRatio).toBeUndefined()
  })

  it("every resolved placement lands on a real ramp and a real step", () => {
    for (const brand of Object.values(BRANDS)) {
      const tokens = resolveTokens(paletteFor(brand), "full", "AAA")
      for (const t of tokens) {
        for (const loc of [t.light, t.dark]) {
          expect(STEPS).toContain(loc.step)
          expect(loc.ramp).toBeTruthy()
        }
        expect(t.lightHex).toMatch(/^#[0-9a-f]{6}$/i)
        expect(t.darkHex).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })
})

describe("resolveTokens — collision reporting", () => {
  it("a near-grey brand reports collided tokens instead of hiding them", () => {
    // Derivation has no hue to rotate, so brand/accent/tertiary land together.
    // That's a constraint, not a bug — but it must be surfaced.
    const tokens = resolveTokens(paletteFor(BRANDS.grey), "full", "AA")
    const warned = tokens.filter((t) => t.warnings?.length)
    expect(warned.length).toBeGreaterThan(0)
    expect(warned[0].warnings![0].reason).toMatch(/grey|saturated/i)
    for (const t of warned) {
      for (const w of t.warnings!) {
        expect(w.sameAs.length).toBeGreaterThan(0)
        // A token never collides with itself, and only ever with its own kind.
        expect(w.sameAs).not.toContain(t.token)
      }
    }
  })

  it("bg-surface matching bg-surface-raised in light is not reported as a collision", () => {
    // Light has no step above neutral-50, so a raised surface can't sit above a
    // plain one — elevation reads through shadow there. Intentional, and
    // whitelisted, so it must not raise a warning.
    const tokens = resolveTokens(paletteFor(BRANDS.blue), "full", "AA")
    const raised = tokens.find((t) => t.token === "bg-surface-raised")!
    const surface = tokens.find((t) => t.token === "bg-surface")!
    expect(raised.lightHex).toBe(surface.lightHex)
    for (const t of [raised, surface]) {
      const light = t.warnings?.filter((w) => w.mode === "light") ?? []
      expect(light.flatMap((w) => w.sameAs)).not.toContain(
        t.token === "bg-surface" ? "bg-surface-raised" : "bg-surface",
      )
    }
  })
})
