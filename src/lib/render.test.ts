import { it, expect } from "vitest"
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
