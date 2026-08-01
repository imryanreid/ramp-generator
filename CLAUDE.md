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

There is **no backend**. Every palette is derived in the browser from four
inputs. Keep it that way — it's why share links work without a database and why
the site costs nothing to run.

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

**1. The URL contract.** `?b=`, `?a=`, `?m=`, `?s=`, `?c=` are a public API. They're
documented in `README.md`, in the JSON-LD block in `index.html`, and in the
on-page legend in `App.tsx`. Changing a param name or a scheme id breaks every
link anyone has shared. If you change one, update all four places.

**2. Machine-readability.** Being consumable by agents is a stated goal, not a
nice-to-have. That means: `robots.txt` stays permissive, the JSON-LD block stays
accurate, and the "Machine-readable palette" section keeps rendering the full
palette as plain text in the DOM. Don't move that content behind an interaction.

## Contrast resolution

`resolveTokens` in `src/lib/semantics.ts` is the most subtle code here. It moves
token steps to satisfy the selected WCAG target, in three stages: foreground
only, then action fills (never page surfaces), then best-effort with an honest
badge. Candidates are scored by combined travel from the authored steps — that
scoring is load-bearing. Ranking on the background alone lets a tie flip a brand
button from light to dark text, which looks like a bug even though it passes.

## Ask before

- Adding, removing, or upgrading any dependency.
- Touching `.env` files (there are none today — the app needs no secrets).
- Anything that would add a server, a database, or a build-time API call.

## Verify before calling it done

```bash
pnpm build
```

That runs `tsc --noEmit` and then the Vite build. Both must be clean. For visual
changes, actually load the page — check light *and* dark, and check that a share
link still round-trips.
