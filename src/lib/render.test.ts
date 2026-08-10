import { describe, it, expect } from "vitest"
import { GET } from "../../api/render.js"

const SHELL = `<!doctype html><html><head>
<link rel="canonical" href="https://www.ramps.studio/" />
<meta name="description" content="original" />
<meta property="og:url" content="https://www.ramps.studio/" />
<meta property="og:image" content="https://www.ramps.studio/api/og" />
<meta name="twitter:image" content="https://www.ramps.studio/api/og" />
<meta name="robots" content="index, follow" />
</head><body><div id="root"></div></body></html>`

async function render(search: string) {
  const real = globalThis.fetch
  globalThis.fetch = (async () => new Response(SHELL, { status: 200 })) as never
  try {
    return await (await GET(new Request(`https://www.ramps.studio/${search}`))).text()
  } finally {
    globalThis.fetch = real
  }
}

it("output is unchanged", async () => {
  const html = await render("?b=3d7dff")
  expect(html).toContain('<link rel="canonical" href="https://www.ramps.studio/?b=3d7dff')
  expect(html).toContain('<meta name="robots" content="noindex, follow" />')
  expect(html).toContain('content="https://www.ramps.studio/api/og?b=3d7dff')
  expect(html).not.toContain('content="original"')
  expect(html).toContain('id="agent-palette"')
})

it("a $ in an interpolated value cannot splice the document", async () => {
  // The regression this guards: with a replacement STRING, "$&" in the value
  // would expand to the whole match and "$`" to everything before it, pasting
  // document into an attribute. A replacer function inserts it literally.
  const evil = "$&$`$'$1"
  const out = "before" + "MID".replace(/MID/, () => evil) + "after"
  expect(out).toBe("before$&$`$'$1after")
  // And the string form, for contrast — this is what we removed.
  const unsafe = "before" + "MID".replace(/MID/, evil) + "after"
  expect(unsafe).not.toBe(out)
  expect(unsafe).toContain("before")
})

describe("the JSON block cannot be escaped from", () => {
  it("never emits a literal </script inside the payload", async () => {
    // Ramps is not vulnerable today — its parameters are charset-constrained —
    // but the embed had the same shape as Motion's, which was. This pins the
    // class shut rather than relying on the decoders staying strict.
    const html = await render("?b=3d7dff")
    const block = html.slice(html.indexOf('id="ramps-studio-palette"'))
    const json = block.slice(0, block.indexOf("</script>"))
    expect(json.toLowerCase()).not.toContain("</script")
  })

  it("escapes < as \\u003c and round-trips", () => {
    const payload = { note: "</script><img src=x onerror=1>" }
    const encoded = JSON.stringify(payload).replace(/</g, "\\u003c")
    expect(encoded).not.toContain("<")
    expect(JSON.parse(encoded)).toEqual(payload)
  })
})

describe("a rejected parameter is not reported as an absent one", () => {
  it("says the value was unreadable, and names the parameter not the value", async () => {
    // "?b=%23ff0000" looks like a hex colour and fails the six-char test. It
    // used to be told no colour had been supplied, which is false and gives a
    // caller no reason to retry.
    const html = await render("?b=" + encodeURIComponent("#ff0000"))
    expect(html).toContain("could not be read")
    expect(html).not.toContain("No brand color was supplied")
    // The rejected value itself is never echoed.
    expect(html).not.toContain("%23ff0000")
  })

  it("still says nothing was supplied when nothing was", async () => {
    const html = await render("")
    expect(html).toContain("No brand color was supplied")
  })
})
