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
// Only "/" is matched, and only URLs carrying ?b=
// are diverted — the bare homepage stays a static
// asset with no function in front of it.
// ==============================================
import { next, rewrite } from "@vercel/functions"

export const config = { matcher: "/" }

export default function middleware(request: Request): Response {
  const url = new URL(request.url)
  if (!url.searchParams.has("b")) return next()

  const target = new URL("/api/render", url)
  target.search = url.search
  return rewrite(target)
}
