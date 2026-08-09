# CLAUDE.md — Ramps Studio

> **What this file is for:** How we work together on _this_ project — stack,
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
- **Three names, and only three.** Four were once in circulation, so an unfurl
  and a search result disagreed about what this is:
  - **Ramps Studio** — the brand. `og:site_name`, `public/llms.txt`, the agent
    payload, the share-image eyebrow, this file's title.
  - **Color Ramp Generator** — the product. The in-app header and the
    share-image headline.
  - **Color Ramp & Semantics Generator** — the descriptive title. `<title>`,
    `og:title`, `twitter:title`, the JSON-LD `name`.

  Don't reintroduce a fourth, and don't collapse these into one — `og:site_name`
  and `og:title` are deliberately different because an unfurl renders both, so
  repeating the words wastes the card. Note the escaping: `&amp;` in HTML
  attributes, a bare `&` inside the `ld+json` script, whose contents are not
  HTML-parsed. The `README.md` H1 is deliberately left as "Ramp Generator" —
  renaming it to the brand would duplicate the ramps.studio link directly below.

## `src/shared/` is authored here, and it fans out

This repo is **upstream** for the whole family. `scripts/.is-upstream` marks it,
and `pnpm sync` from here pushes `src/shared/` into every sibling tool repo
under `Studio Tools/` with `rsync -a --delete`.

Three consequences worth holding in your head before you touch anything in
there:

**1. A change here lands in every tool.** Motion Studio renders the same
`Segmented`, `ToolShell`, `Label` and `ExportPanel` you're editing. "Does this
still look right in Ramps?" is half the question; the other half is Motion, and
soon Shape, Type and Icons. Check the family before changing a shared
component's size, colour or spacing — a three-pixel height change to
`Segmented` was invisible here and misaligned two panel headers there.

**2. It is a single-writer bottleneck.** Two agents editing `src/shared/`
concurrently produce real conflicts that then fan out to every downstream repo.
If work is being split across parallel sessions, keep shared-layer changes on
**one** of them and let the others work in `src/lib/`, `src/components/` and
`api/`.

**3. Downstream copies are disposable.** `rsync --delete` means anything
edited in a sibling's `src/shared/` is destroyed silently by the next sync —
no conflict, no warning, no trace. If someone reports that a fix "didn't
stick" in another tool, this is why.

To verify nothing has drifted:

```bash
pnpm sync:check    # diff every sibling; exits non-zero on drift
pnpm sync          # push this repo's src/shared to all of them
```

And because this site is live on a custom domain, a shared change follows the
branch rule below like any other — with the extra wrinkle that its blast radius
is every tool, not just this one.

## Worktrees go inside `Studio Tools/`

`scripts/sync-shared.sh` resolves the family by **filesystem path**, not by git:
`FAMILY_ROOT` is simply the parent directory of the repo. A worktree checked out
somewhere else — `~/Projects/ramps-feature-x` — will look for the family in
`~/Projects`, not find it, and fail.

```bash
git worktree add "../Ramps Studio-feature-x" -b feature-x origin/main
```

Any sibling directory containing a `package.json` is treated as a tool repo by
`pnpm sync`, so a worktree placed correctly also receives the shared layer.
That's intended — it keeps the worktree building — but it does mean `pnpm sync`
will `rsync --delete` into it without asking.

## The three things that are easy to break

**0. The canonical host is `https://www.ramps.studio`** — with the `www`, because
that's what Vercel serves as primary; the bare apex 308-redirects to it. Six
files hardcode it and they must agree, or the canonical tag ends up naming a URL
that redirects elsewhere:

- `index.html` — `<link rel="canonical">`, `og:url`, the JSON-LD `url` and `urlTemplate`
- `src/lib/site.ts` — `SITE_URL`, which builds every share link
- `src/lib/agent.ts` — the payload's `$schema` and `generator` fields
- `public/llms.txt`, `public/sitemap.xml`, `public/robots.txt`

If the primary domain ever flips in Vercel, change all six together. Verify with
`git grep -c "www\.ramps\.studio"` rather than by memory — this list has gone
stale before.

**1. The URL contract.** `?b=`, `?a=`, `?a2=`, `?m=`, `?s=`, `?c=`, `?f=`, `?xr=`,
`?xt=` are a public API. Changing a param name or a scheme id breaks every link
anyone has shared. Five places document them and must agree:

- `README.md` — the share-links table
- `public/llms.txt` — the parameter table
- `index.html` — the JSON-LD `urlTemplate` and its `query-input` list
- `src/App.tsx` — the on-page legend above the machine-readable palette
- `src/lib/agent.ts` — the "REGENERATE WITH DIFFERENT INPUTS" block, which is the
  only copy a no-JavaScript reader ever sees

Adding a param is backward-compatible, but the docs still have to agree — `a2`
and `f` shipped while four of these five said nothing about them.

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

A third constraint, added later: excluding a token that other tokens are _paired
against_ (`bg-canvas`, `bg-brand`, `bg-accent`) leaves their contrast guarantee
dangling — the foregrounds survive still claiming AA/AAA, but the color they were
measured against is gone. `missingContrastReferences` detects that and exports
name the background as a reference value rather than forcing it back into the
palette. Same class of bug as the Figma dangling alias; check for it whenever
exclusions grow new behavior.

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

Ramp and token checkboxes filter the _output_, never the computation.
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

## Never push straight to `main`

This site is live on a custom domain, so every change goes through a branch and
a Vercel preview, and Ryan looks before it merges.

```bash
git checkout -b <branch> && git push -u origin <branch>
# Vercel builds a preview automatically; hand over the link, then merge.
```

The rule is about visibility, not risk. Don't argue a change is safe enough to
skip it — "I want to see it before the public does" needs no risk case, and
re-deriving one per change wastes everyone's time.

**Previews are SSO-gated**, so an anonymous `curl` gets a 302 to
`vercel.com/sso-api`. Use the Vercel MCP's `get_access_to_vercel_url` for a
bypass link when you need to fetch one.

One caveat worth knowing: with Deployment Protection on, `api/render`'s own
fetch of `/index.html` is intercepted and served the login page at status 200.
The guard in `api/render.ts` catches that now, but it means a preview can't
fully stand in for production when verifying the agent path.

Sibling tools on `*.vercel.app` placeholders don't need this — the rule starts
when a domain does.

## Verify before calling it done

```bash
pnpm build
```

That runs `tsc --noEmit` and then the Vite build. Both must be clean. For visual
changes, actually load the page — check light _and_ dark, and check that a share
link still round-trips.
