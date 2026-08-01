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
- **There is no working formatter.** oxfmt (0.2.0, inherited from the Figma
  scaffold) **corrupts the code**: it strips the separators inside single-line
  TypeScript type literals, turning `{ title: string; description: string }`
  into `{ title: string description: string }`. Running it produced six syntax
  errors across `App.tsx` and `semantics.ts` and broke the build. The `format`
  script now fails loudly instead of running it. Prettier is the obvious
  replacement — declined earlier on style grounds, but that was before this was
  a correctness problem.

---

## Session log

### 2026-08-01 — Second accent picker; format-aware inputs; PDF hidden

- **`accent-2` is pinnable** via a second picker in the accent block and a new
  `a2=` param. One Auto/Manual switch governs both accents — splitting them
  would add two states to explain for a case nobody asked for. Changing the
  derivation still releases both.
- **The brand and accent inputs follow the Format selector**, so picking OKLCH
  no longer leaves hex fields underneath it. `normalizeHex` now accepts any CSS
  notation, so a field showing `oklch(...)` takes one back, as well as a pasted
  hex, `rgb()` or `hsl()`.
  **Known rough edge:** two accent fields side by side can't show a full
  `oklch(...)` string — it truncates. The swatch still conveys the colour and
  the field is editable, and hex fits fine, but it's not ideal. Widening the
  accent block further, stacking the two fields, or showing an abbreviated form
  are the options.
- **PDF export is hidden**, not removed. The print stylesheet works and is
  committed; `onPrint` is still wired through `ExportPanel`. Re-adding the
  choice card is a few lines once the output has had design attention.

### 2026-08-01 — PDF export; neutral split reverted

- **PDF export** via a print stylesheet and `window.print()`. No dependency;
  the browser paginates and offers Save as PDF. The rule the whole thing hangs
  on is `print-color-adjust: exact` — without it browsers drop backgrounds and
  every swatch prints as an empty rectangle. Also unsets the `overflow-x-auto`
  scrollers (they clip on paper), repeats the token table header per page,
  avoids breaking inside a ramp, and forces the light theme.
- **Neutral split reverted** to a single `neutral` ramp. `neutral-light` /
  `neutral-dark` didn't achieve what it was meant to.
- **`bg-inverse` / `text-inverse` kept** — they work fine against one ramp
  (neutral-900 surface in light, neutral-100 in dark) at 11.7:1 / 10.6:1.
- The audit fixes survived the revert: `bg-muted` still has its own step, and
  the text ladder still reads 10.6 / 7.8 / 5.6 in light.
- **Excluded ramps now show a raw value in RAMP view**, since that's what the
  exporters emit for them. Pointing at a scale the consumer won't receive was
  misleading.
- Reset → Undo is one element that eases its width and crossfades its label,
  rather than swapping between two elements.

### 2026-08-01 — Split neutrals and inverse tokens

- **`neutral` became `neutral-light` + `neutral-dark`.** Dark carries double the
  chroma and a lightness range compressed onto [0.28, 0.93] — greys tuned
  against white read flat on a dark screen, and dark themes rarely want true
  black. `bg-canvas` in dark went from `#1c1e22` to `#252931`, so this is a
  visible change rather than a rename.
- All 11 neutral-backed tokens resolve light to `neutral-light`, dark to
  `neutral-dark`.
- **New `bg-inverse` / `text-inverse`** (full scope). The inverted surface pulls
  from the _other_ mode's neutral, so a light theme gets a properly-built dark
  grey instead of the far end of its own ramp — that's the payoff of the split.
  Resolves at 9.0:1 light / 10.6:1 dark.
- Both neutrals would have collided on the display name "Neutral", so
  `NAME_OVERRIDES` in semantics.ts names them explicitly.

**URL contract note:** `xr=neutral` no longer matches anything, since the names
are now `neutral-light` / `neutral-dark`. A shared link that excluded the neutral
ramp silently stops excluding it. Narrow enough to accept, but it is a real break.

### 2026-08-01 — OKLCH by default; accent/derivation pairing

- **OKLCH is now the default notation.** The ramps are built in OKLCH, so hex
  was throwing away the gamut headroom by default. `f=` is omitted from the URL
  at the default, which is now `oklch` rather than `hex`.
- **Control order** is Brand, Accent, Derivation, Format, Contrast, Scope.
- **Accent and Derivation are visually paired.** They share a wrapper so they
  wrap as one unit, with a rule drawn between them while the accent is on Auto.
  On Manual the rule disappears and Derivation dims to 45%.
  **It stays selectable on purpose** — derivation still shapes accent-2, the
  neutral tint and status vividness even when the accent is pinned, so
  disabling it would be a lie. The dimming says "no longer driving the accent",
  not "inert". Worth revisiting if that reads as too subtle.
- `ColorInput` split into `BrandField` and `AccentField` so Accent can sit
  beside Derivation. Both the hex fields and the scheme select are `h-9` now, so
  the connector lines up with their centres.

### 2026-08-01 — Header copy, share images, picker, colour formats

- **Header copy** now reads ramps.studio / Color Ramp Generator / "Generate
  agent-optimized, accessible color ramps in a few clicks."
- **Per-palette share images** (`api/og.tsx`) rendered with @vercel/og from the
  same `buildPalette` + `readableText` the site uses, so a link unfurls with its
  own colours. Satori needs TTF/OTF and both Inter and JetBrains Mono ship
  WOFF2-only, so the image uses Geist + Geist Mono (SIL OFL, licence in
  `public/fonts/`). Display face matches exactly; body face is a near neighbour.
- **Reset control** between theme and share, red on hover, with the same
  checkmark confirmation the share button uses. Clears the inputs and both
  exclusion sets; the URL effect then strips the query string.
- **Ramp checkboxes** moved right of their labels, matching the section headings.
- **Colour picker** is now react-colorful in a popover (2.8 KB, MIT, no deps)
  instead of the OS colour chrome. The hex field remains the precise input.
- **Format selector** (`f=` param): hex / oklch / rgb / hsl, driving the swatch
  labels, token table, copied values, and the CSS/Tailwind/JSON exports. Figma
  deliberately stays structured sRGB — W3C DTCG specifies a structured colour
  value, not a CSS string. The agent payload and `/api/palette` stay hex so
  machine consumers keep one canonical, universally parseable format.
  Watch out: labels are only uppercased for hex, since `OKLCH(...)` reads wrong.

### 2026-08-01 — Server-rendered palettes for agents

**The audit finding that drove this:** the site is client-rendered, so a plain
fetch of a share link returned an empty `#root`. Verified by fetching a palette
URL with a real agent tool — it came back with the page title and nothing else.
Worse than a clean failure: the meta description confidently describes a palette
that isn't in the response, inviting hallucinated hex values. The in-browser
testing used up to that point was blind to this, because the browser is the one
client that already worked.

- **`api/render.ts`** — serves `/` when the URL carries `?b=`, injecting the
  palette as both JSON and plain text and rewriting canonical/description/og:url
  to describe that specific palette. React still boots over it.
- **`api/palette.ts`** — `GET /api/palette`, same data as JSON.
- **`public/llms.txt`** — the URL contract written for agents.
- **`vercel.json`** — routes `/` to the function only when `?b=` is present, so
  the bare homepage stays a static asset.
- **`src/lib/params.ts`** — the URL contract split out of `share.ts` because the
  functions can't import anything touching `import.meta.env` or `window`.
- **`src/lib/agent.ts`** — builds the payload; shared by both functions.

Two non-obvious constraints, both easy to undo by accident:

- The injected block carries **no hiding styles**. `display:none` reads as the
  obvious choice but readability-style extractors honour it and skip the
  content. It ships visible and `src/main.tsx` removes it on mount.
- It emits **both** JSON and plain text because HTML-to-markdown conversion
  strips `<script>` tags.

Anything touching `api/`, `agent.ts`, or `params.ts` must be verified with a real
no-JavaScript fetch — a browser check proves nothing here.

**Two Vercel gotchas this cost a deploy each — don't relearn them:**

1. **A `vercel.json` rewrite on `/` never fires.** Rewrites are evaluated after
   the filesystem check, and `index.html` already satisfies `/`. Routing
   Middleware runs before that check, which is why `middleware.ts` exists.
2. **Functions transpile, they don't bundle.** With `"type": "module"`, Node ESM
   needs explicit extensions on relative imports or the function dies at runtime
   with `ERR_MODULE_NOT_FOUND`. Everything in `src/lib` and `api` therefore
   imports with `.js`; Vite and TS `bundler` resolution map that back to `.ts`.

**Verified live:** a plain fetch of a palette URL returns 15,090 bytes with the
full palette (was 4,871 with none). The bare homepage is untouched at 4,871
bytes / ~200 ms — middleware only diverts URLs carrying `?b=`. Canonical,
`og:url`, and the description are rewritten per palette. An agent fetch that
previously returned only the page title now returns the brand color, the WCAG
level, and exact light/dark hex values.

### 2026-08-01 — Per-row export selection

- **Checkboxes on all 45 rows** (8 ramps + 37 tokens), plus mixed-state toggles
  on each section header. Unchecking dims the row and drops it from every export
  and the agent block; it does _not_ stop the row being generated.
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
  ranked by _combined_ travel from their authored steps. Ranking on the fill
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
