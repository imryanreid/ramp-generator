// ==============================================
// GET /
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
// The bare homepage comes through here too, carrying
// the default palette — it's the URL an agent lands
// on when it was told the tool's name but given no
// link. Only the *parameterized* URLs get their
// <head> rewritten to describe their own palette;
// the homepage keeps the metadata that makes it the
// site's one indexable page.
// ==============================================
import { buildAgentPayload, publicOrigin } from "../src/lib/agent.js"
import { encodeShareState } from "../src/lib/params.js"

/**
 * Escapes for an HTML attribute. Always pass its result through a *replacer
 * function*, never a replacement string.
 *
 * `String.replace` expands `$&`, `` $` ``, `$'` and `$1` inside a replacement
 * string, and that expansion happens after this function runs — so a `$` in an
 * escaped value could splice a chunk of the surrounding document into an
 * attribute and break out of it. Escaping cannot prevent it; only avoiding the
 * string form can. A function's return value is inserted literally.
 *
 * Nothing reaching here can contain a `$` today, but that invariant lives in
 * src/lib/params.ts — far from this file, and easy to widen without ever
 * looking here.
 */
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
  //
  // Never a cached copy. "/index.html" is a stable URL whose contents change
  // every deployment, so a CDN hit can hand this function the *previous*
  // build's shell: stale meta tags, and asset hashes that now 404. Motion hit
  // exactly that in production — the page served a current palette grafted
  // onto a document whose JavaScript no longer existed, which looks fine to an
  // agent and is completely broken for a person. This code was the same shape,
  // so it was one deploy away from the same failure.
  //
  // Two defences because one is only a hint: cache: "no-store" asks, and the
  // per-deployment query key guarantees a distinct cache entry even if the ask
  // is ignored. A query string doesn't change which static file resolves.
  const shellUrl = new URL("/index.html", url.origin)
  const build = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA
  if (build) shellUrl.searchParams.set("__build", build)
  const shell = await fetch(shellUrl, {
    cache: "no-store",
    headers: { "user-agent": "ramps-studio-render" },
  })
  if (!shell.ok) {
    return new Response("Unable to load the page shell.", { status: 502 })
  }
  let html = await shell.text()

  // Make sure what came back is actually our shell before injecting into it.
  //
  // `shell.ok` is not enough. With Vercel Deployment Protection on — which is
  // the default for preview deployments — this internal fetch is intercepted
  // and served Vercel's SSO login page with a 200, so the guard above passes
  // and the palette gets grafted onto somebody else's document. Observed on
  // the first preview of this branch: a 508 KB login page with a working
  // palette bolted to the bottom of it.
  //
  // Production is unprotected, so this never fires there. It's here because
  // silently wrapping the wrong page is a worse failure than not wrapping one,
  // and because it makes protected previews behave sensibly — the auth
  // redirect passes straight through instead of being disguised.
  if (!html.includes('<div id="root">')) {
    return new Response(html, {
      status: shell.status,
      headers: { "content-type": shell.headers.get("content-type") ?? "text/html" },
    })
  }

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

  // Only a URL that actually asked for a palette gets its <head> rewritten. The
  // bare homepage must keep `index, follow` and its own canonical — routing it
  // through here to pick up the readable block must not quietly deindex the
  // site's only indexable page.
  if (url.searchParams.has("b")) {
    // Point the canonical at *this* palette rather than the bare homepage, so a
    // shared link doesn't announce itself as a duplicate of the front page.
    const ogImage = `${origin}/api/og?${encodeShareState(state)}`
    html = html
      .replace(
        /<link rel="canonical" href="[^"]*" \/>/,
        () => `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
      )
      .replace(
        /(<meta\s+name="description"\s+content=")[^"]*(")/s,
        (_m, open: string, close: string) => `${open}${escapeHtml(summary)}${close}`,
      )
      .replace(
        /(<meta property="og:url" content=")[^"]*(")/,
        (_m, open: string, close: string) => `${open}${escapeHtml(canonical)}${close}`,
      )
      // Point the share image at this palette so a link unfurls with its own
      // colors rather than the default blue.
      .replace(
        /(<meta property="og:image" content=")[^"]*(")/,
        (_m, open: string, close: string) => `${open}${escapeHtml(ogImage)}${close}`,
      )
      .replace(
        /(<meta name="twitter:image" content=")[^"]*(")/,
        (_m, open: string, close: string) => `${open}${escapeHtml(ogImage)}${close}`,
      )
      // Keep parameterized palettes out of the search index. Each one is
      // self-canonical so it shares and unfurls correctly, but `?b=` is an
      // unbounded parameter space and letting a crawler wander it would bloat the
      // index of a site with exactly one real page. `follow` keeps outbound links
      // live, and this says nothing to agents — they fetch and read regardless of
      // indexing directives.
      .replace(
        /<meta name="robots" content="[^"]*" \/>/,
        '<meta name="robots" content="noindex, follow" />',
      )
  }

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
