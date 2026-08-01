// ==============================================
// ROUTING MIDDLEWARE
// Sends palette URLs to the renderer that embeds the
// colors in the HTML.
//
// This can't be a `rewrites` rule in vercel.json:
// rewrites are evaluated *after* the filesystem
// check, and "/" is satisfied by the static
// index.html, so such a rule never fires. Middleware
// runs before that check.
//
// Every "/" request is diverted, including the bare
// homepage. That URL is how an agent told to "use
// ramps.studio" arrives — there's no link to follow
// yet, so it has to find the default palette and the
// query-string contract in the page itself. Serving
// it as a static asset left it with nothing to read.
//
// Only "/" is matched, so /index.html is still a
// plain file and api/render can fetch it as the
// shell without recursing.
// ==============================================
import { rewrite } from "@vercel/functions"

export const config = { matcher: "/" }

export default function middleware(request: Request): Response {
  const url = new URL(request.url)
  const target = new URL("/api/render", url)
  target.search = url.search
  return rewrite(target)
}
