import { describe, expect, it } from "vitest"
import { boldLiftsChroma, buildPalette } from "./recommend.js"

describe("the bold saturation floor", () => {
  it("has nothing to lift on a saturated brand — and says so", () => {
    // The default brand. bold and natural must agree, and the predicate that
    // drives the chip's inert state must agree with that.
    expect(boldLiftsChroma("#3d7dff")).toBe(false)
  })

  it("lifts a muted brand", () => {
    expect(boldLiftsChroma("#8a8580")).toBe(true)
    expect(boldLiftsChroma("#ece9e0")).toBe(true)
  })

  it("the predicate matches what the palette actually does", () => {
    // The chip is only honest if "would this change anything" tracks whether
    // anything changes. Assert them together rather than trusting the floor.
    for (const brand of ["#3d7dff", "#8a8580", "#ece9e0", "#b28200"]) {
      const nat = JSON.stringify(buildPalette(brand, null, "full", "complementary", null, "natural"))
      const bold = JSON.stringify(buildPalette(brand, null, "full", "complementary", null, "bold"))
      expect(nat !== bold, `${brand}`).toBe(boldLiftsChroma(brand))
    }
  })
})
