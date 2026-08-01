// ==============================================
// GET /api/palette
// The palette as structured JSON, for agents and
// scripts that want data rather than a page.
//
// Same query contract as the site itself, so an
// agent handed a share link can swap "/" for
// "/api/palette" and get the machine-readable form.
// Pure function of the query string — no state, no
// storage — so responses cache indefinitely.
// ==============================================
import { buildAgentPayload, publicOrigin } from "../src/lib/agent.js"

export function GET(request: Request): Response {
  const url = new URL(request.url)
  const { json } = buildAgentPayload(url.search, publicOrigin(request))

  return new Response(JSON.stringify(json, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Deterministic output, so let the CDN keep it indefinitely.
      "cache-control": "public, max-age=0, s-maxage=31536000, immutable",
      // Read-only public data; usable from anywhere.
      "access-control-allow-origin": "*",
      // The HTML page is the indexable surface, not this.
      "x-robots-tag": "noindex",
    },
  })
}
