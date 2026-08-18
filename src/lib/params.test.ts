// ==============================================
// URL PARAM TESTS
// The address bar is the save file, so anything the
// visitor can change has to survive a round trip
// through the query string.
//
// These exist because pinning the tertiary accent
// updated the palette but not the URL: App.tsx
// listed the state fields its sync effect depended
// on by hand, and `accent2Override` was missing from
// the list. The effect now depends on the encoded
// string itself, which makes *this* the invariant
// worth guarding — if a field stops affecting the
// encoding, the address bar silently stops tracking it.
// ==============================================
import { describe, it, expect } from "vitest"
import {
  DEFAULT_STATE,
  encodeShareState,
  decodeShareState,
  resolveShareState,
  type ShareState,
} from "./params.js"

/**
 * A value differing from the default for every field. Written out rather than
 * generated so that adding a field to ShareState fails the first assertion
 * below until someone decides what "changed" means for it.
 */
const CHANGED: { [K in keyof ShareState]: ShareState[K] } = {
  brand: "#ee00ff",
  accentOverride: "#c15f3c",
  accent2Override: "#8d6bff",
  mode: "basic",
  scheme: "triadic",
  compliance: "AAA",
  format: "hex",
  vividness: "bold",
  excludedRamps: ["info"],
  excludedTokens: ["bg-info"],
}

describe("the query string is the whole save file", () => {
  it("covers every field of ShareState", () => {
    expect(Object.keys(CHANGED).sort()).toEqual(Object.keys(DEFAULT_STATE).sort())
  })

  it("encodes a change to every single field", () => {
    const base = encodeShareState(DEFAULT_STATE)
    for (const key of Object.keys(CHANGED) as (keyof ShareState)[]) {
      const changed = { ...DEFAULT_STATE, [key]: CHANGED[key] } as ShareState
      expect(encodeShareState(changed), `${key} does not reach the URL`).not.toBe(base)
    }
  })

  it("round-trips every field back to the same value", () => {
    const full = { ...DEFAULT_STATE, ...CHANGED } as ShareState
    expect(resolveShareState(`?${encodeShareState(full)}`)).toEqual(full)
  })

  it("encodes a pinned tertiary accent — the regression", () => {
    // The palette updated and the address bar didn't, so a link copied out of
    // it silently dropped the tertiary accent.
    const pinned: ShareState = { ...DEFAULT_STATE, accent2Override: "#8d6bff" }
    expect(encodeShareState(pinned)).toContain("a2=8d6bff")
    expect(decodeShareState(`?${encodeShareState(pinned)}`).accent2Override).toBe("#8d6bff")
  })

  it("leaves optional params out until they differ from the default", () => {
    // Keeps an untouched landing page URL clean, and keeps every link shared
    // before a param existed decoding to exactly what it always did.
    const bare = encodeShareState(DEFAULT_STATE)
    for (const p of ["a=", "a2=", "f=", "v=", "xr=", "xt="]) {
      expect(bare).not.toContain(p)
    }
  })
})
