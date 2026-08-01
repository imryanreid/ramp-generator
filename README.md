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

## Export formats

| Format | Output |
| --- | --- |
| **CSS variables** | Custom properties under `:root` and `.dark`. |
| **Tailwind v4** | A `@theme` block you can paste straight into your stylesheet. |
| **Figma variables** | W3C DTCG token JSON, one file per mode — import via Figma's native variable import, one import per mode. |
| **JSON** | The whole palette as structured data. |

## Share links

The entire palette is a pure function of four inputs, so a link needs no
database — the inputs fit in the query string:

```
https://www.ramps.studio/?b=3d7dff&a=ff8a00&m=full&s=complementary
```

| Param | Meaning |
| --- | --- |
| `b` | Brand hex, no `#`. Required. |
| `a` | Accent hex, no `#`. Optional — omit to auto-derive from the scheme. |
| `m` | Scope: `full` or `basic`. |
| `s` | Scheme: `complementary`, `analogous`, `triadic`, `split`, or `monochromatic` |

Malformed params are dropped individually, so a bad link degrades to defaults
rather than erroring.

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
