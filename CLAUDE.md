# CLAUDE.md — Color Ramp Generator

> **What this file is for:** How we work together on *this* project — stack,
> conventions, and the rules that are specific to it. Global preferences live in
> `~/CLAUDE.md`; where the two conflict, this file wins. For what each file
> does, see [`PROJECT_MAP.md`](PROJECT_MAP.md). For where we left off, see
> [`NEXT-UP.md`](NEXT-UP.md).

## What this is

A single-page tool at [ramps.studio](https://www.ramps.studio) that turns one brand
color into a full design-system palette — OKLCH ramps, derived accents, a
matched neutral, status colors, and semantic tokens tuned to a chosen WCAG
level — exportable as CSS variables, a Tailwind v4 theme, Figma variables
(W3C DTCG), or JSON, or as a prompt for a coding agent.
Public, open source (MIT), and a portfolio piece.

## Stack

React 19 · Vite · Tailwind CSS v4 · TypeScript (strict) · culori · Motion ·
pnpm · deployed on Vercel.

**No database, no state, no auth.** Every palette is a pure function of the URL.
Two Vercel Functions under `api/` exist solely because the site is
client-rendered and most agents don't run JavaScript — they recompute the same
pure function server-side. Keep it that way: nothing in `api/` should ever read
or write persistent state, so every response stays cacheable forever.

## History: this began in Figma Make

The project was originally built in Figma Make and exported. As of the migration
it has been fully decoupled: the `.figma/` directory, the Figma Vite plugins,
the LFS `.gitattributes`, and the `site.json` config are all gone. **Don't
reintroduce Figma Make conventions.** If you find a leftover, remove it.

## Conventions

- **Every file opens with a comment block** explaining what it does in plain
  language, in the banner style already used across `src/`. Add brief comments
  above meaningful sections within a file.
- **Class names go through `cn()`** (`src/lib/utils.ts`) whenever there's a
  conditional. Static class strings can stay inline.
- **Fonts are self-hosted** via Fontsource. Never load from the Google Fonts CDN
  or any other font CDN.
- **Color math belongs in `src/lib/`**, not in components. Components render;
  `lib/` decides.
- **`src/lib/semantics.ts` exporters are canonical.** The export modal and the
  agent-readable block on the page both render from them — don't create a third
  serialization.

## The three things that are easy to break

**0. The canonical host is `https://www.ramps.studio`** — with the `www`, because
that's what Vercel serves as primary; the bare apex 308-redirects to it. Six
places hardcode it and they must agree, or the canonical tag ends up naming a
URL that redirects elsewhere: `index.html` (`<link rel="canonical">`, `og:url`,
the JSON-LD `url` and `urlTemplate`), `src/lib/site.ts` (`SITE_URL`, which builds
every share link), `public/sitemap.xml`, and `public/robots.txt`. If the primary
domain ever flips in Vercel, change all of them together.

**1. The URL contract.** `?b=`, `?a=`, `?m=`, `?s=`, `?c=`, `?xr=`, `?xt=` are a public API. They're
documented in `README.md`, in the JSON-LD block in `index.html`, and in the
on-page legend in `App.tsx`. Changing a param name or a scheme id breaks every
link anyone has shared. If you change one, update all four places.

**2. Machine-readability.** Being consumable by agents is a stated goal, not a
nice-to-have. That means: `robots.txt` stays permissive, the JSON-LD block stays
accurate, and the "Machine-readable palette" section keeps rendering the full
palette as plain text in the DOM. Don't move that content behind an interaction.

## Agent consumption is a first-class use case

The site is client-rendered, so a plain fetch of a share link returns an empty
`#root` — nothing readable unless the agent executes JavaScript, which most
link-following agents don't. `api/render.ts` fixes that by injecting the palette
into the HTML for any URL carrying `?b=` (routed there by `middleware.ts` — a
`vercel.json` rewrite cannot work, because rewrites run after the filesystem
check and `index.html` already satisfies `/`); `api/palette.ts` serves the same data
as JSON; `public/llms.txt` documents the contract.

Two non-obvious constraints hold this together:

- **The injected block carries no hiding styles.** `display:none` would be the
  obvious way to keep it from human eyes, but readability-style extractors honour
  inline hiding and skip such content. It ships visible and `src/main.tsx`
  removes it on mount instead.
- **It emits both JSON and plain text.** HTML-to-markdown conversion strips
  `<script>` tags, so a JSON-only payload is invisible to exactly the tools this
  exists for.

Anything touching `api/`, `src/lib/agent.ts`, or `src/lib/params.ts` must be
verified with a real no-JavaScript fetch. Testing in a browser proves nothing
here — the browser is the one client that already worked.

## Contrast resolution

`resolveTokens` in `src/lib/semantics.ts` is the most subtle code here. It moves
token steps to satisfy the selected WCAG target, in three stages: foreground
only, then action fills (never page surfaces), then best-effort with an honest
badge. Candidates are scored by combined travel from the authored steps — that
scoring is load-bearing. Ranking on the background alone lets a tie flip a brand
button from light to dark text, which looks like a bug even though it passes.

## Exclusions

Ramp and token checkboxes filter the *output*, never the computation.
`resolveTokens` always resolves the full set — contrast pairing depends on it,
and the UI needs it to render dimmed rows — and `selectedRamps` / `selectedTokens`
filter afterwards. Never move that filtering earlier: excluding `bg-canvas` would
otherwise break the contrast math for every token measured against it.

One consequence worth remembering: `toFigma` aliases tokens into ramp groups, so
a token whose ramp is excluded would produce a dangling variable reference that
Figma rejects on import. Those tokens fall back to literal colors instead.

## Ask before

- Adding, removing, or upgrading any dependency.
- Touching `.env` files (there are none today — the app needs no secrets).
- Adding state anywhere — a database, a session, a write path. The functions in
  `api/` are pure and must stay pure.

## Verify before calling it done

```bash
pnpm build
```

That runs `tsc --noEmit` and then the Vite build. Both must be clean. For visual
changes, actually load the page — check light *and* dark, and check that a share
link still round-trips.
