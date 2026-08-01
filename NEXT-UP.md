# Next Up

> **What this file is for:** Session handoff state — what was most recently
> built, what to do next, and known blockers. Read at the start of a session,
> update at the end. Previous sessions stay as a rolling log. Not a spec — see
> [`CLAUDE.md`](CLAUDE.md) for conventions and [`PROJECT_MAP.md`](PROJECT_MAP.md)
> for the file inventory.

## Current state

Live on Vercel at **https://www.ramps.studio**, fully decoupled from Figma Make.
Source at **https://github.com/imryanreid/ramp-generator** (public, MIT), `main`
tracking `origin/main`. Builds clean, typechecks clean, no console errors.

**The canonical host is `www.ramps.studio`, not the bare apex.** Vercel is
configured with `www` as the primary domain and `ramps.studio` 308-redirecting
to it. Every absolute URL in the codebase must match — see the note in
[`CLAUDE.md`](CLAUDE.md).

**Remaining — all outside the codebase:**

1. ~~Create the public GitHub repo and push.~~ **Done 2026-08-01.**
2. ~~Create the Vercel project.~~ **Done 2026-08-01.**
3. ~~Move `ramps.studio` off Figma Make.~~ **Done 2026-08-01.** DNS cut over at
   Squarespace: apex A → Vercel, `www` CNAME → the per-domain
   `*.vercel-dns-016.com` target. The `v=spf1 -all` TXT record was deliberately
   left in place; there are no MX or CAA records on the domain.
4. ~~Turn on Vercel Analytics + Speed Insights.~~ **Done 2026-08-01.** Both
   `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` serve
   200 on the live site, so the wiring in `src/main.tsx` is live, not just
   toggled on in the dashboard.
5. ~~Verify the domain in Google Search Console.~~ **Done 2026-08-01.** Set up
   as a **Domain property** on `ramps.studio` (covers the apex, `www`, and any
   subdomain), verified by a root TXT record alongside the existing SPF record.
   **Still to do:** submit `https://www.ramps.studio/sitemap.xml` in the Search
   Console UI. The site was `noindex` for its whole life under Figma Make, so
   it has never been crawled — expect indexing to take days, not hours.

## Known gaps / deliberate omissions

- **No `og:image`.** Links unfurl as a text-only card. Considered and skipped
  for now; generating one from the app's own palette output would be a nice
  touch later.
- **No `llms.txt`.** Considered and skipped — the JSON-LD block and the on-page
  machine-readable palette already cover the agent-consumption goal.
- **Fonts total ~118 KB** for the Latin subsets of three families (Geist, Inter,
  JetBrains Mono). Self-hosted, so no third-party round trip, but if load time
  ever matters more than the type choices, dropping to two families is the lever.
- **oxfmt** is still the formatter, inherited from the Figma scaffold. It works;
  it's just an unusual choice. Swapping to Prettier was considered and declined.

---

## Session log

### 2026-08-01 — Per-row export selection

- **Checkboxes on all 45 rows** (8 ramps + 37 tokens), plus mixed-state toggles
  on each section header. Unchecking dims the row and drops it from every export
  and the agent block; it does *not* stop the row being generated.
- **Filtering happens after resolution, never before.** Contrast pairing needs
  the full set — `text-primary` is measured against `bg-canvas` even when
  `bg-canvas` is unchecked — so `resolveTokens` still returns everything and
  `selectedRamps` / `selectedTokens` filter downstream. Moving that earlier
  would silently break the AA/AAA math.
- **New `xr=` / `xt=` params**, dot-separated names. Names not a bitmask: a
  bitmask would make the token table's declaration order a permanent public
  contract. Dots not commas: `URLSearchParams` percent-encodes a comma.
  Verified round-trip, and malformed input (including a `<script>` payload)
  degrades to `{}`.
- **Figma alias trap, handled**: `toFigma` aliases tokens into ramp groups, so a
  token whose ramp was unchecked would emit a dangling variable reference that
  Figma rejects on import. Those now fall back to a literal color. Verified
  headlessly — `bg-tertiary` goes from `{Ramps.Cyan.600}` to `#007fa5`, and no
  alias in the output points at a missing group.
- **Exporters now take an options object** rather than four positional args.
- **README gained a "Forking this" section** listing the four things wired to
  this deployment — canonical URL, `SITE_URL`, sitemap/robots, footer
  attribution. The canonical tag is the one that bites: left unchanged, a fork
  tells Google its content is a duplicate of ramps.studio.

### 2026-08-01 — Contrast enforcement, agent prompt export, Phosphor icons

- **WCAG AA/AAA toggle** on the controls row, wired through to a new `c=` share
  param. Selecting a level doesn't just re-badge — `resolveTokens` moves token
  steps until every paired foreground clears the target. Foreground first, then
  action fills (never page surfaces), then honest best-effort. Fill families
  (`bg-brand` + hover + active) shift together to keep the interaction ladder
  ordered. Verified: at AAA on the default palette, 15 tokens move and **zero**
  remain below 7:1.
- **The scoring detail that matters**: candidate (fill, foreground) pairs are
  ranked by *combined* travel from their authored steps. Ranking on the fill
  alone made `bg-brand` lighten one step and flip its label to dark text — same
  distance, but a much bigger visual change than darkening one step and keeping
  the authored light label.
- **Export flow is now two-step**: choose "Export code" (the four format tabs)
  or "Copy agent prompt" — a ready-to-paste prompt carrying the share URL plus
  the constraints an agent needs (prefer semantic tokens, don't substitute
  colors into contrast-checked pairs, keep the hex values exact).
- **Icons**: all 17 inline SVGs replaced with Phosphor (MIT), regular weight.
  Costs ~41 KB raw / ~10 KB gzipped — each Phosphor icon bundles all six
  weights, so the per-icon cost is real even after tree-shaking.
- **Fixed a latent bug**: `CANONICAL_TITLE` was a module-level
  `const = document.title`. Correct in production, but Vite HMR re-executes the
  module and would capture a palette-specific title as "canonical", so the
  landing page never restored its real title in dev. Now stashed on `window`
  and captured once per page load.


### 2026-08-01 — Migration off Figma Make

Took the exported Figma Make project and made it self-hostable.

- **Stripped Figma**: deleted `.figma/`, cut `vite.config.ts` from 400 lines to
  24 by removing four Figma-only plugins, replaced the templated `index.html`
  with a real one, deleted the LFS `.gitattributes`, renamed the package from
  `figma-make-app`.
- **Fixed indexability**: the Figma `site.json` had `robots.index: false`, which
  was emitting `noindex, nofollow` and a `Disallow: /` robots.txt. Now indexable,
  with a canonical URL, Open Graph tags, a JSON-LD `WebApplication` block that
  documents the URL API, a permissive `robots.txt`, and a sitemap.
- **Assets**: 5.2 MB → 3 KB. Deleted five unreferenced PNGs; resized the two
  footer avatars from 3.87 MB and 1.33 MB (both rendered at 24 px) to 96 px WebP.
  Both now inline as data URIs at build time.
- **Fonts**: moved Geist, Inter, and JetBrains Mono off the Google Fonts CDN to
  self-hosted Fontsource variable fonts. Note the family names gained a
  " Variable" suffix in the `@theme` block.
- **Share links**: `SHARE_BASE` was hardcoded mid-file in `share.ts`; it's now
  `SITE_URL` in `src/lib/site.ts`, overridable with `VITE_SITE_URL`.
- **Clean landing page**: the URL sync and dynamic `<title>` now only engage once
  state diverges from `DEFAULT_STATE`, so a fresh visit stays at `/` with the
  canonical title — that's what crawlers index.
- **Added**: `cn()` utility, Vercel Analytics + Speed Insights, MIT license, and
  this doc set.
- **Deployed** to Vercel on `www.ramps.studio`, with the apex 308-redirecting to
  it. All absolute URLs in the codebase were repointed at `www` to match, since
  the canonical tag would otherwise have named a redirecting URL.
- **DNS**: cut over at Squarespace off Figma Make. Two Let's Encrypt certs (one
  per hostname). Worth knowing: for a while the site appeared to have no cert
  when tested locally — that was a stale macOS resolver cache still holding
  Figma's old Cloudflare IPv6 address. Public resolvers were correct throughout.
  If HTTPS looks broken from a machine that used to reach the Figma version,
  flush the DNS cache before assuming a real problem.
- **Published** to https://github.com/imryanreid/ramp-generator. The repo had
  been created with GitHub's auto-generated `LICENSE` commit; that was replaced
  by a force push so history starts at the migration commit. The only difference
  was the copyright line — kept as "Ryan Reid" to match the app footer, README,
  and JSON-LD author field.
