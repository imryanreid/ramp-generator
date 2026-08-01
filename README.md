# Ramp Generator

**[ramps.studio](https://www.ramps.studio)**

Pick one brand color. Get a complete design system: perceptually-even OKLCH
ramps, derived accents, a matched neutral, status colors, and usage-first
semantic tokens for light and dark — exportable as CSS custom properties, a
Tailwind v4 theme, Figma variables, or JSON.

Everything is computed in the browser. There is no backend, no account, and no
stored data.

---

## Why OKLCH

Ramps built by lightening and darkening a hex value in sRGB drift: the mid-tones
bloom, the darks go muddy, and two ramps built the same way from different hues
don't feel like siblings. OKLCH is perceptually uniform, so a step at lightness
`0.637` reads as the same *visual* lightness whether the hue is blue or yellow.

This tool fixes a lightness curve across eleven steps (50–950) and applies a
bell-curve chroma multiplier that peaks in the mid-tones — so the lightest and
darkest steps desaturate the way hand-tuned ramps do, instead of staying
artificially vivid. Every generated ramp is then gamut-clamped back into sRGB.

## What it generates

| Group | How it's derived |
| --- | --- |
| **Brand** | Your color, laid out across 11 steps. |
| **Accents** | Rotated off the brand hue by the chosen scheme — complementary, analogous, triadic, split-complementary, or monochromatic. Overridable with a locked hex. |
| **Neutral** | A near-grey ramp carrying a trace of the brand hue, so greys sit with the palette rather than against it. |
| **Status** | Success, warning, error, and info anchored at conventional hues, then nudged away from your palette's own hues if they collide — so "error" never reads as "brand". |
| **Semantic tokens** | Usage-first names (surface, border, text, interactive states) mapped onto ramp steps, resolved separately for light and dark. |

## Contrast is enforced, not just reported

Pick `AA` (4.5:1) or `AAA` (7:1) and the tokens *move* to satisfy it, rather than
showing you a red badge and leaving the fix to you.

For each paired foreground the resolver first walks that token along its own ramp
to the nearest step that clears the target. If the foreground runs out of ramp,
the background moves too — but only action fills (`bg-brand`, `bg-accent`), never
page surfaces, so the page keeps its character while a button darkens to keep its
label legible. When a fill moves, its `-hover` and `-active` siblings move with
it, so the interaction ladder stays ordered.

Candidate pairs are scored by how far *both* colors travel from their authored
steps, so the result stays as close to the designed palette as the target allows.
If a ramp genuinely cannot reach the target, the tool takes the best contrast
available and badges the shortfall honestly instead of faking a pass.

## Export formats

| Format | Output |
| --- | --- |
| **CSS variables** | Custom properties under `:root` and `.dark`. |
| **Tailwind v4** | A `@theme` block you can paste straight into your stylesheet. |
| **Figma variables** | W3C DTCG token JSON, one file per mode — import via Figma's native variable import, one import per mode. |
| **JSON** | The whole palette as structured data. |

The export dialog opens on a choice: take the tokens as code, or copy a prompt
pointing an agent at this exact palette.

## Share links

The entire palette is a pure function of four inputs, so a link needs no
database — the inputs fit in the query string:

```
https://www.ramps.studio/?b=3d7dff&a=ff8a00&m=full&s=complementary&c=AA
```

| Param | Meaning |
| --- | --- |
| `b` | Brand hex, no `#`. Required. |
| `a` | Accent hex, no `#`. Optional — omit to auto-derive from the scheme. |
| `m` | Scope: `full` or `basic`. |
| `s` | Scheme: `complementary`, `analogous`, `triadic`, `split`, or `monochromatic` |
| `c` | Contrast target: `AA` (4.5:1) or `AAA` (7:1). |
| `xr` | Ramps left out of the export, dot-separated — e.g. `accent-2.info`. |
| `xt` | Semantic tokens left out, dot-separated — e.g. `bg-info.text-warning`. |

Malformed params are dropped individually, so a bad link degrades to defaults
rather than erroring.

`xr` and `xt` carry *names* rather than a bitmask over the token table. A bitmask
would be far shorter, but it would make the table's declaration order a permanent
public contract — inserting a token in the middle would silently repoint every
link already shared. Names only break on a rename, which is a breaking change
anyway, and they stay readable to the agents this URL API exists for. The
separator is `.` because `URLSearchParams` percent-encodes a comma but leaves
dots alone.

## Choosing what to export

Every ramp and every semantic token has a checkbox. Unchecking one dims the row
and drops it from the exports and the agent block — it does **not** stop it being
generated. That distinction matters: contrast resolution needs the full set
(`text-primary` is measured against `bg-canvas` even when `bg-canvas` is
unchecked), so exclusions are applied after the math, never before.

Unchecking a ramp drops its 50–950 scale but leaves tokens that reference it
working. In the Figma export those tokens would otherwise become dangling
variable aliases, so they fall back to literal color values instead — the file
always imports cleanly.

## Using it from an agent

The page is built to be read by machines as well as people:

- **`robots.txt` allows everything.** Nothing here is private or rate-limited.
- **JSON-LD in `<head>`** describes the tool and documents the URL API above,
  readable without executing JavaScript.
- **A "Machine-readable palette" block** at the bottom of the page renders the
  full palette — every ramp step and every semantic token, light and dark — as
  plain text in the DOM, in either CSS or JSON. No hovering or clicking needed
  to reach the values.
- **Construct a URL, read the result.** Because state lives entirely in the
  query string, an agent can request an arbitrary palette by building a link.
- **A prepared prompt.** The export dialog can hand you a ready-to-paste prompt
  containing the link to your palette plus the constraints an agent needs to
  apply it correctly.

## Forking this

The code is MIT — fork it, change it, ship it. Four things are wired to *this*
deployment and want changing if you run your own:

| Change | Where |
| --- | --- |
| The canonical URL — otherwise your deploy tells search engines it belongs to ramps.studio | `<link rel="canonical">`, `og:url`, and the JSON-LD `url` + `urlTemplate` in `index.html` |
| Share-link origin | `SITE_URL` in `src/lib/site.ts`, or set `VITE_SITE_URL` in your host's environment |
| Sitemap + robots URLs | `public/sitemap.xml`, `public/robots.txt` |
| Footer attribution — my name, photo, and studio | `Attribution` in `src/App.tsx`, plus the two images in `src/assets/` |

The canonical tag is the one that actually bites: it is invisible, and left
unchanged it quietly tells Google your copy is a duplicate of this site.

Nothing else is environment-specific. There are no secrets, no API keys, and no
env vars required to run or deploy — `pnpm install && pnpm build` is the whole
setup. The Vercel Analytics beacons no-op anywhere that isn't a Vercel project.

Keeping the `LICENSE` file is the one thing MIT actually requires.

## Local development

Requires Node 22 and pnpm (see `.mise.toml`).

```bash
pnpm install && pnpm dev
```

| Script | Does |
| --- | --- |
| `pnpm dev` | Vite dev server with hot reload |
| `pnpm build` | Typecheck, then build to `dist/` |
| `pnpm preview` | Serve the built output locally |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Format with oxfmt |

Built with React 19, Vite, Tailwind CSS v4, [culori](https://culorijs.org/) for
the color math, and [Motion](https://motion.dev/) for animation.

## Docs

- [`PROJECT_MAP.md`](PROJECT_MAP.md) — what every file does
- [`NEXT-UP.md`](NEXT-UP.md) — session handoff state
- [`docs/DESIGN-NOTES.md`](docs/DESIGN-NOTES.md) — original build plans, kept as history

## License

MIT — see [`LICENSE`](LICENSE).

Built by [Ryan Reid](https://www.linkedin.com/in/imryanreid/) at
[tktk studio](https://www.tktk.studio/).
