// ==============================================
// AGENT PAYLOAD TESTS
// buildAgentPayload is what a client that doesn't run
// JavaScript actually receives — api/render injects
// its output into the HTML and api/palette serves it
// as JSON. A browser is the one client that already
// worked, so testing this in a browser proves
// nothing; these run the function directly.
//
// This does not replace an end-to-end fetch against a
// deployed function. It covers the payload's content,
// which is where the regressions have been.
// ==============================================
import { describe, it, expect } from "vitest"
import { buildAgentPayload } from "./agent.js"
import { TOOLS } from "../shared/tools.js"

const ORIGIN = "https://www.ramps.studio"
const build = (search: string) => buildAgentPayload(search, ORIGIN)

describe("buildAgentPayload — the family is discoverable without JavaScript", () => {
  it("names every tool, shipped or not", () => {
    const { text } = build("?b=3d7dff")
    for (const tool of TOOLS) {
      expect(text, `${tool.name} missing from the payload`).toContain(tool.name)
      expect(text).toContain(tool.title)
    }
  })

  it("links the shipped ones and says so about the rest", () => {
    const { text } = build("?b=3d7dff")
    for (const tool of TOOLS) {
      if (tool.domain) expect(text).toContain(`https://${tool.domain}/`)
    }
    // Unshipped tools must not appear as a URL — a dead link is worse than none.
    expect(text).toContain("not yet released")
    expect(text).not.toMatch(/https:\/\/motion\.studio/)
  })

  it("marks the current tool rather than offering it as somewhere to go", () => {
    expect(build("?b=3d7dff").text).toMatch(/Ramps.*\(this tool\)/s)
  })

  it("is present on the bare homepage too", () => {
    // The URL an agent lands on when it was told the tool's name but given no
    // link. If the family list only appeared on parameterized URLs, a cold
    // start would never see it.
    expect(build("").text).toContain("Motion")
  })
})

describe("buildAgentPayload — the palette contract still holds", () => {
  it("emits ramps, tokens and measured contrast", () => {
    const { json } = build("?b=e4572e&s=analogous&c=AAA")
    expect(json.input.brand).toBe("#e4572e")
    expect(json.input.scheme).toBe("analogous")
    expect(json.input.wcag).toBe("AAA")
    expect(Object.keys(json.ramps)).toContain("primary")
    expect(json.tokens["text-primary"].contrast?.against).toBe("bg-canvas")
    expect(json.tokens["text-primary"].contrast!.light).toBeGreaterThan(1)
  })

  it("says out loud when it picked the brand color itself", () => {
    expect(build("").text).toMatch(/No brand color was supplied/)
    expect(build("?b=e4572e").text).not.toMatch(/No brand color was supplied/)
  })

  it("degrades a malformed link to defaults instead of erroring", () => {
    const { state } = build("?b=nothex&s=bogus&c=AAAA&m=weird")
    expect(state.brand).toBe("#3d7dff")
    expect(state.scheme).toBe("complementary")
    expect(state.compliance).toBe("AA")
    expect(state.mode).toBe("full")
  })

  it("spells out the URL contract so a cold start can regenerate", () => {
    const { text } = build("")
    for (const param of ["b ", "a2", "m ", "s ", "c ", "f ", "xr", "xt"]) {
      expect(text).toContain(param)
    }
    expect(text).toContain(`${ORIGIN}/api/palette`)
    expect(text).toContain(`${ORIGIN}/llms.txt`)
  })
})
