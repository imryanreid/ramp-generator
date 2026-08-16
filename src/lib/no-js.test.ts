// ==============================================
// NO-JAVASCRIPT TESTS
// What an agent actually receives.
//
// The site is client-rendered, so a plain fetch of a
// share link would return an empty #root. api/render
// exists to fix that, and CLAUDE.md is right that a
// browser can't verify it — the browser is the one
// client that already worked.
//
// These call the real GET handlers with a stubbed
// fetch for the page shell, so the assertions are
// against the bytes the function would actually
// return. They caught nothing when written; they
// exist so the next refactor of src/shared can't
// quietly sever the agent path.
// ==============================================
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { GET as renderGET } from "../../api/render.js"
import { GET as paletteGET } from "../../api/palette.js"
import { TOOLS } from "../shared/tools.js"

const SHELL = "dist/index.html"
const ORIGIN = "https://www.ramps.studio"

// api/render fetches the built shell as a static asset. Serve it from disk.
const realFetch = globalThis.fetch
beforeAll(() => {
  if (!existsSync(SHELL)) {
    throw new Error(`${SHELL} missing — run \`pnpm build\` before these tests.`)
  }
  const html = readFileSync(SHELL, "utf8")
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url.endsWith("/index.html")) {
      return new Response(html, { status: 200, headers: { "content-type": "text/html" } })
    }
    throw new Error(`unexpected fetch in test: ${url}`)
  })
})
afterAll(() => vi.stubGlobal("fetch", realFetch))

const render = (path: string) =>
  renderGET(
    new Request(`${ORIGIN}${path}`, {
      headers: { "x-forwarded-host": "www.ramps.studio", "x-forwarded-proto": "https" },
    }),
  ).then(async (r) => ({ status: r.status, headers: r.headers, html: await r.text() }))

describe("GET / — the page an agent fetches", () => {
  it("embeds the palette as both JSON and plain text", async () => {
    const { status, html } = await render("/?b=3d7dff")
    expect(status).toBe(200)

    // Both shapes ship on purpose: HTML-to-markdown conversion strips <script>,
    // so a JSON-only payload would be invisible to the tools this exists for.
    expect(html).toContain('<div id="agent-palette">')
    expect(html).toContain('<script type="application/json" id="ramps-studio-palette">')
    // The <pre> has to wrap. Unwrapped, the payload's longest line lays out
    // ~2774px wide — seven times a phone viewport — for as long as the block
    // is in the document, which leaves a phone scrolled into empty space.
    expect(html).toContain("<pre style=")
    expect(html).toContain("white-space:pre-wrap")

    const json = JSON.parse(
      html.split('id="ramps-studio-palette">')[1].split("</script>")[0].trim(),
    )
    expect(json.ramps.primary["500"]).toMatch(/^#[0-9a-f]{6}$/i)
    expect(json.tokens["text-primary"].contrast.against).toBe("bg-canvas")
  })

  it("carries no hiding styles on the injected block", async () => {
    // display:none would be the obvious way to keep it from human eyes, but
    // readability-style extractors honour inline hiding and skip such content —
    // which would defeat the entire point. main.tsx removes it on mount instead.
    const { html } = await render("/?b=3d7dff")
    const block = html.slice(html.indexOf('<div id="agent-palette">'))
    expect(block).not.toMatch(/display:\s*none/i)
    expect(block).not.toMatch(/hidden|aria-hidden|visibility:\s*hidden/i)
  })

  it("removes the block inline, without hiding it from a reader of the source", async () => {
    // The block ships visible so extractors read it, which means a browser
    // paints it until JavaScript takes it away. Doing that only from main.tsx
    // left it on screen for as long as the ~500 KB bundle took to arrive — a
    // visible flash of raw text on every load. An inline script closes that
    // window during parsing.
    //
    // This is safe for the same reason the payload is emitted twice: anything
    // stripping <script> never runs it and still reads the <pre>. So the two
    // assertions that matter are that the text survives *and* the script is
    // there — losing either one is a regression, in opposite directions.
    const { html } = await render("/?b=3d7dff")
    expect(html).toMatch(/getElementById\("agent-palette"\)/)
    expect(html.indexOf("agent-palette")).toBeLessThan(html.lastIndexOf("agent-palette"))

    // Strip every script the way an HTML-to-markdown converter would: the
    // palette must still be legible afterwards.
    const stripped = html.replace(/<script[\s\S]*?<\/script>/g, "")
    expect(stripped).toContain('<div id="agent-palette">')
    expect(stripped).toContain("RAMPS STUDIO — GENERATED COLOR PALETTE")
    expect(stripped).toMatch(/#[0-9a-f]{6}/i)
  })

  it("survives HTML-to-markdown: the values are in text, not only in script", async () => {
    const { html } = await render("/?b=3d7dff")
    // Strip every <script> the way a markdown converter would, then check the
    // palette is still readable.
    const stripped = html.replace(/<script[\s\S]*?<\/script>/gi, "")
    expect(stripped).toContain("RAMPS STUDIO — GENERATED COLOR PALETTE")
    expect(stripped).toContain("SEMANTIC TOKENS")
    expect(stripped).toContain("REGENERATE WITH DIFFERENT INPUTS")
    expect(stripped).toMatch(/primary:/)
    expect(stripped).toMatch(/#[0-9a-f]{6}/i)
  })

  it("tells an agent about the rest of the family, without JavaScript", async () => {
    const stripped = (await render("/?b=3d7dff")).html.replace(
      /<script[\s\S]*?<\/script>/gi,
      "",
    )
    expect(stripped).toContain("OTHER TOOLS IN THIS FAMILY")
    for (const tool of TOOLS) expect(stripped).toContain(tool.name)
    expect(stripped).toContain("https://www.ramps.studio/")
    expect(stripped).toContain("not yet released")
  })

  it("serves the bare homepage — the cold-start URL — with a full palette", async () => {
    // Where an agent lands when told the tool's name but handed no link.
    const { html } = await render("/")
    expect(html).toContain('<div id="agent-palette">')
    expect(html).toContain("REGENERATE WITH DIFFERENT INPUTS")
    expect(html).toContain("OTHER TOOLS IN THIS FAMILY")
  })

  it("keeps the homepage indexable and marks palette URLs noindex", async () => {
    // Routing every "/" through the renderer must not deindex the site's one
    // indexable page.
    expect((await render("/")).html).toContain('<meta name="robots" content="index, follow" />')
    expect((await render("/?b=3d7dff")).html).toContain(
      '<meta name="robots" content="noindex, follow" />',
    )
  })

  it("points a palette URL's canonical and share image at itself", async () => {
    const { html } = await render("/?b=e4572e&s=analogous&c=AAA")
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/www\.ramps\.studio\/\?b=e4572e/)
    expect(html).toMatch(/og:image" content="https:\/\/www\.ramps\.studio\/api\/og\?b=e4572e/)
  })

  it("still boots the React app over the injected block", async () => {
    const { html } = await render("/?b=3d7dff")
    expect(html).toContain('<div id="root"></div>')
    expect(html).toMatch(/<script type="module"[^>]*src="[^"]*index-[^"]*\.js"/)
    // The block sits outside #root, so hydration never touches it.
    expect(html.indexOf('<div id="root">')).toBeLessThan(html.indexOf('id="agent-palette"'))
  })

  it("stays cacheable — the response is a pure function of the query string", async () => {
    const { headers } = await render("/?b=3d7dff")
    expect(headers.get("cache-control")).toContain("s-maxage=")
    expect(headers.get("set-cookie")).toBeNull()
  })
})

describe("GET / — when the shell isn't ours", () => {
  it("passes an interception through instead of injecting into it", async () => {
    // Vercel Deployment Protection intercepts the function's own fetch of
    // /index.html and answers with an SSO login page — at status 200, so
    // `shell.ok` is true. Without a content check the palette gets grafted onto
    // Vercel's login page, which is what the first preview of this branch
    // actually served.
    const login =
      "<!DOCTYPE html><html><head><title>Login – Vercel</title></head><body>sso</body></html>"
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(login, { status: 200, headers: { "content-type": "text/html" } }),
    )
    const { status, html } = await render("/?b=3d7dff")
    expect(status).toBe(200)
    expect(html).toBe(login)
    expect(html).not.toContain("agent-palette")
  })
})

describe("GET /api/palette — the JSON endpoint", () => {
  it("returns the palette with permissive CORS", async () => {
    const res = paletteGET(new Request(`${ORIGIN}/api/palette?b=3d7dff`))
    expect(res.status).toBe(200)
    expect(res.headers.get("access-control-allow-origin")).toBe("*")
    const json = JSON.parse(await res.text())
    expect(json.input.brand).toBe("#3d7dff")
    expect(Object.keys(json.ramps).length).toBeGreaterThan(0)
    expect(json.notes.length).toBeGreaterThan(0)
  })
})
