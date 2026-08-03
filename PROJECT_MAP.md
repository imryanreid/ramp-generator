# Project Map

> **What this file is for:** An inventory of every file in the codebase and what
> it does, in plain language. Update it whenever files are created, renamed, or
> moved. Not a spec, not a changelog — see [`NEXT-UP.md`](NEXT-UP.md) for
> session state and [`README.md`](README.md) for what the product is.

## Root

| File             | What it does                                                                                                                                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.html`     | The page shell Vite builds around. Holds the real `<title>`, description, canonical URL, Open Graph tags, and the JSON-LD block that describes the tool to search engines and agents.                                                                                                                        |
| `middleware.ts`  | Sends every `/` request to `api/render`, including the bare homepage — that's the URL an agent lands on when it was told the tool's name but given no link. Must be middleware rather than a `vercel.json` rewrite: rewrites are evaluated after the filesystem check, which `index.html` already satisfies. |
| `vite.config.ts` | Build config. React + Tailwind plugins, the `@` → `src/` alias, and React deduping.                                                                                                                                                                                                                          |
| `tsconfig.json`  | TypeScript settings. Strict mode on, no emit (Vite handles the build).                                                                                                                                                                                                                                       |
| `package.json`   | Dependencies and scripts.                                                                                                                                                                                                                                                                                    |
| `pnpm-lock.yaml` | Locked dependency versions. Commit changes to this.                                                                                                                                                                                                                                                          |
| `.mise.toml`     | Pins the toolchain: Node 22, pnpm 10.                                                                                                                                                                                                                                                                        |
| `.gitignore`     | Keeps `node_modules/`, `dist/`, and `.env*` out of git.                                                                                                                                                                                                                                                      |
| `LICENSE`        | MIT.                                                                                                                                                                                                                                                                                                         |

## `api/` — Vercel Functions

Pure functions of the query string. No state, no storage; responses cache
indefinitely. They exist because the site is client-rendered and most agents
don't execute JavaScript.

| File         | What it does                                                                                                                                                                                                                                                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `render.ts`  | Serves every `/`. Fetches the built `index.html` and injects the palette as both JSON and plain text. Only URLs carrying `?b=` also get the canonical/description/og:url rewritten to describe that palette and marked `noindex` — the bare homepage keeps `index, follow` so routing it through here doesn't deindex the site's one indexable page. The React app still boots over it. |
| `palette.ts` | `GET /api/palette` — the same palette as JSON, for agents and scripts that want data rather than a page.                                                                                                                                                                                                                                                                                |

## `public/` — copied to the site root verbatim

| File                   | What it does                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `favicon.svg`          | Tab icon and the source of truth for the icon shape: a five-step ramp of the default brand blue.                              |
| `icon-192.png`         | Raster fallback of the same shape. Exists for Google Search, which documents neither SVG support nor sizes at or below 48x48. |
| `apple-touch-icon.png` | The same shape, full-bleed and square — iOS applies its own rounding, so rounded corners here would read as a doubled edge.   |
| `robots.txt`           | Allows all crawlers, points at the sitemap, and tells agents where `llms.txt` is.                                             |
| `sitemap.xml`          | One entry — the site is a single page.                                                                                        |
| `llms.txt`             | The URL contract written for agents: parameters, an example, and how to apply a palette correctly.                            |

Both PNGs are generated — edit `favicon.svg`, then re-run `scripts/build-icons.py`
or they drift from it.

## `scripts/` — build-time helpers, run by hand

| File             | What it does                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `build-icons.py` | Renders `public/icon-192.png` and `public/apple-touch-icon.png` from the shape in `favicon.svg`. Pure stdlib — no rasterizer dependency to draw four rounded bars. |

## `src/` — application code

| File            | What it does                                                                                                                                                                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main.tsx`      | Entry point. Mounts `App` into `#root`, loads the stylesheet, attaches Vercel Analytics and Speed Insights.                                                                                                                                                                                                           |
| `App.tsx`       | The whole page: holds the five pieces of state everything derives from, syncs the URL and document title, and lays out the controls, ramps, tokens, and footer. Also contains the small local components — icon buttons, theme toggle, share button, export modal, and the machine-readable palette block for agents. |
| `index.css`     | Global stylesheet. Imports the self-hosted fonts, defines the Tailwind v4 theme (`paper`/`ink`/`ash`/`line` color tokens), and flips those tokens for dark mode.                                                                                                                                                      |
| `vite-env.d.ts` | Vite's ambient type declarations.                                                                                                                                                                                                                                                                                     |

### `src/lib/` — the logic, no UI

| File           | What it does                                                                                                                                                                                                                                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color.ts`     | The engine. Also holds `formatColor`, which writes any hex as hex/oklch/rgb/hsl for both display and export. Converts a hex to OKLCH and builds an 11-step ramp (50–950) using a fixed lightness curve and a bell-curve chroma multiplier, clamping each result back into sRGB. Also builds the tinted neutral ramp and computes contrast for the swatch labels.                  |
| `recommend.ts` | Decides _which_ colors to generate. Rotates the brand hue by the chosen scheme to derive accents, picks status hues, and pushes any status hue that lands too close to a palette hue out of the way. Exports `SCHEMES` and `buildPalette`.                                                                                                                                        |
| `semantics.ts` | Maps ramp steps onto usage-first token names (surface, border, text, interactive states) for both light and dark, nudging steps as needed so every paired foreground clears the selected WCAG target, then serializes the result — `toCss`, `toTailwind`, `toFigma` (W3C DTCG), and `toJson`. These exporters are the canonical output format; everything else renders from them. |
| `params.ts`    | The URL contract: encode/decode the inputs that reproduce a palette, validating each field independently so a malformed link falls back to defaults. Deliberately free of browser and Vite globals so the functions in `api/` can import it.                                                                                                                                      |
| `share.ts`     | Browser-side helpers over `params.ts` — absolute share URLs and reading state from `window.location`.                                                                                                                                                                                                                                                                             |
| `agent.ts`     | Turns a query string into the payload an agent receives, as structured JSON and as plain readable text. Shared by both functions.                                                                                                                                                                                                                                                 |
| `site.ts`      | The canonical site origin, used to build absolute share URLs. Overridable via `VITE_SITE_URL`.                                                                                                                                                                                                                                                                                    |
| `clipboard.ts` | `copyToClipboard` plus the `useCopy` hook that drives the "Copied" confirmations.                                                                                                                                                                                                                                                                                                 |
| `utils.ts`     | `cn()` — merges Tailwind class names via clsx + tailwind-merge.                                                                                                                                                                                                                                                                                                                   |

### `src/components/` — presentational pieces

| File                 | What it does                                                                                                                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ColorInput.tsx`     | The brand and accent pickers: a swatch that opens a react-colorful popover, a hex field, and the lock/reset behaviour for overriding the auto-derived accent.                                                                                                                       |
| `SchemeSelect.tsx`   | The derivation dropdown (complementary, analogous, triadic, split, monochromatic) with its descriptions.                                                                                                                                                                            |
| `RampGroup.tsx`      | Renders a titled group of ramps as rows of swatches, each with an include/exclude checkbox beside its name.                                                                                                                                                                         |
| `SemanticTokens.tsx` | The semantic token table — token name, the ramp step it resolves to, light/dark previews, and a contrast badge whose pass threshold follows the selected WCAG level.                                                                                                                |
| `ExportPanel.tsx`    | The contents of the export modal. Opens on a choice between taking the tokens as code and copying an agent prompt. The code branch has a tab per format (CSS variables, Tailwind v4, Figma variables, JSON) with copy and download; the Figma tab emits one W3C DTCG file per mode. |
| `RowToggle.tsx`      | The checkbox beside each ramp and token row, including the mixed-state variant used for section-level toggles.                                                                                                                                                                      |
| `CopyButton.tsx`     | Button that copies a value and crossfades to a checkmark.                                                                                                                                                                                                                           |
| `CopyText.tsx`       | Inline text that copies itself when clicked.                                                                                                                                                                                                                                        |

### `src/assets/`

| File               | What it does               |
| ------------------ | -------------------------- |
| `avatar-ryan.webp` | Footer avatar, 96×96.      |
| `logo-tktk.webp`   | Footer studio logo, 96×96. |

Both are under Vite's inline threshold, so they're embedded as data URIs at
build time rather than fetched separately.

## `docs/`

| File              | What it does                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `share.png`       | The social card, committed so the README renders without depending on the deployment being up. Regenerate from `/api/og` if the design changes. |
| `DESIGN-NOTES.md` | The original build plans, kept as history — useful for understanding why the color math is shaped the way it is.                                |
