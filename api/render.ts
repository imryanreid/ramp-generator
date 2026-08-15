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
/**
 * JSON that is safe to sit inside a `<script>` element.
 *
 * `JSON.stringify` does not escape `<`, so any string reaching the payload
 * could carry `</script>` and end the element early — everything after it is
 * then parsed as live HTML. That is not hypothetical: a crafted `pu` parameter
 * did exactly this on production, and `s-maxage=31536000` pinned the result at
 * the edge.
 *
 * `\u003c` is valid JSON and parses back to `<` identically, so no consumer
 * can tell the difference. Escaping here rather than at each field closes the
 * category for every field that gets added later.
 */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Headers every HTML response carries.
 *
 * Not a full CSP — Vite's output plus the inline JSON-LD would need hashes or
 * a nonce, which is real design work and worse half-done. These three are free
 * and independently useful: nosniff matters because this route echoes
 * URL-derived content, the referrer policy matters because the URL *is* the
 * user's palette or motion set and a full path would leak it to every outbound
 * link, and frame-ancestors is cheap clickjacking cover for a page of controls.
 */
const SAFE_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "content-security-policy": "frame-ancestors 'self'",
} as const

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
  // Bounded, with one retry. This fetch had no timeout: if it hung, the
  // invocation held a Fluid Compute concurrency slot until the 300s default —
  // I/O wait, so unbilled, but slots are the contended resource under load.
  const fetchShell = () =>
    fetch(shellUrl, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
      headers: { "user-agent": "ramps-studio-render" },
    })

  let shell: Response
  try {
    shell = await fetchShell()
  } catch {
    try {
      shell = await fetchShell()
    } catch {
      return new Response("Unable to load the page shell.", { status: 502 })
    }
  }

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
      headers: {
        ...SAFE_HEADERS,
        "content-type": shell.headers.get("content-type") ?? "text/html",
      },
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
      headers: { ...SAFE_HEADERS, "content-type": "text/html; charset=utf-8" },
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
  // inline hiding and would skip the block — defeating the point. Instead it
  // ships visible and is removed the moment JavaScript proves a human is
  // looking. It sits below the app, outside #root, so hydration never touches it.
  //
  // Removed twice, on purpose. The inline script below runs *during parsing*,
  // so the block never reaches the screen; `src/main.tsx` also removes it, but
  // that lives in a ~500 KB bundle and only runs once it has downloaded and
  // executed — a window long enough to see the raw text flash past. Neither is
  // redundant: the inline one closes the flash, the bundle one is the fallback
  // if this block is ever emitted without it. Don't delete either without
  // reading the other.
  //
  // This is safe for exactly the reason the payload is emitted twice in the
  // first place: agents that convert HTML to markdown strip <script> tags, so
  // they never run this and still read the <pre>. Anything that does execute it
  // renders the whole React app anyway. Kept ES5-plain and null-guarded — an
  // inline script that throws would be the one thing on the page with no
  // safety net.
  const injected = `
<div id="agent-palette">
<script type="application/json" id="ramps-studio-palette">
${jsonForScript(json)}
</script>
<pre>
${escapeHtml(text)}
</pre>
</div>
<script>var e=document.getElementById("agent-palette");if(e)e.remove()</script>`

  // A replacer function here too, and this one matters more than the head
  // rewrites: `injected` carries the whole payload — the DTCG JSON alone
  // contributes dozens of "$" in $type/$value/$extensions, plus names and free
  // text. None of it forms an expandable sequence today, but nothing
  // constrains it the way the URL charset constrains a parameter, so this is
  // the instance least likely to stay safe by accident.
  html = html.replace("</body>", () => `${injected}\n</body>`)

  return new Response(html, {
    status: 200,
    headers: {
      ...SAFE_HEADERS,
      "content-type": "text/html; charset=utf-8",
      // Deterministic for a given query string.
      "cache-control": "public, max-age=0, s-maxage=31536000, must-revalidate",
    },
  })
}
