// ==============================================
// GET / (only when the URL carries palette params)
//
// The site is a client-rendered SPA, so a plain fetch
// of a share link used to return an empty <div
// id="root"> — nothing an agent could read unless it
// executed JavaScript. Most agents that follow a
// pasted link don't.
//
// This serves the same index.html with the palette
// injected, so one URL works for people and for
// agents. The React app still boots and takes over;
// the injected block sits outside #root so hydration
// never touches it.
//
// vercel.json routes here only when `?b=` is present,
// leaving the bare homepage a static asset.
// ==============================================
import { buildAgentPayload, publicOrigin } from "../src/lib/agent.js"
import { encodeShareState } from "../src/lib/params.js"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const origin = publicOrigin(request)

  // The built shell, fetched as a static asset. `/index.html` isn't matched by
  // the rewrite that sent us here, so this can't recurse.
  const shell = await fetch(new URL("/index.html", url.origin), {
    headers: { "user-agent": "ramps-studio-render" },
  })
  if (!shell.ok) {
    return new Response("Unable to load the page shell.", { status: 502 })
  }
  let html = await shell.text()

  let payload: ReturnType<typeof buildAgentPayload>
  try {
    payload = buildAgentPayload(url.search, origin)
  } catch {
    // A palette we can't compute shouldn't take the page down — fall back to
    // the untouched shell and let the client render it.
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  }

  const { state, json, text } = payload
  const canonical = `${origin}/?${encodeShareState(state)}`
  const summary =
    `Color palette generated from brand ${state.brand}: ` +
    `${state.scheme} derivation, ${state.mode} scope, WCAG ${state.compliance} contrast. ` +
    `Includes OKLCH ramps and semantic tokens for light and dark, with exact hex values.`

  // Point the canonical at *this* palette rather than the bare homepage, so a
  // shared link doesn't announce itself as a duplicate of the front page.
  html = html
    .replace(
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    )
    .replace(
      /(<meta\s+name="description"\s+content=")[^"]*(")/s,
      `$1${escapeHtml(summary)}$2`,
    )
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${escapeHtml(canonical)}$2`)

  // Both shapes on purpose: HTML-to-markdown conversion — what most agents do
  // before reading a page — strips <script>, so JSON alone would be invisible
  // to the very tools this exists for. The <pre> survives that conversion.
  //
  // Deliberately carries no hiding styles. `display:none` would be the obvious
  // way to keep it away from human eyes, but readability-style extractors honour
  // inline hiding and would skip the block — defeating the point. Instead the
  // block ships visible and `src/main.tsx` removes it once React mounts, so
  // only JS-less readers ever see it. It sits below the app, outside #root, so
  // hydration never touches it.
  const injected = `
<div id="agent-palette">
<script type="application/json" id="ramps-studio-palette">
${JSON.stringify(json)}
</script>
<pre>
${escapeHtml(text)}
</pre>
</div>`

  html = html.replace("</body>", `${injected}\n</body>`)

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Deterministic for a given query string.
      "cache-control": "public, max-age=0, s-maxage=31536000, must-revalidate",
    },
  })
}
