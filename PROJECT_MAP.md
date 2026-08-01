# Project Map

> **What this file is for:** An inventory of every file in the codebase and what
> it does, in plain language. Update it whenever files are created, renamed, or
> moved. Not a spec, not a changelog — see [`NEXT-UP.md`](NEXT-UP.md) for
> session state and [`README.md`](README.md) for what the product is.

## Root

| File | What it does |
| --- | --- |
| `index.html` | The page shell Vite builds around. Holds the real `<title>`, description, canonical URL, Open Graph tags, and the JSON-LD block that describes the tool to search engines and agents. |
| `vite.config.ts` | Build config. React + Tailwind plugins, the `@` → `src/` alias, and React deduping. |
| `tsconfig.json` | TypeScript settings. Strict mode on, no emit (Vite handles the build). |
| `package.json` | Dependencies and scripts. |
| `pnpm-lock.yaml` | Locked dependency versions. Commit changes to this. |
| `.mise.toml` | Pins the toolchain: Node 22, pnpm 10. |
| `.gitignore` | Keeps `node_modules/`, `dist/`, and `.env*` out of git. |
| `LICENSE` | MIT. |

## `public/` — copied to the site root verbatim

| File | What it does |
| --- | --- |
| `favicon.svg` | Tab icon: a five-step ramp of the default brand blue. |
| `robots.txt` | Allows all crawlers and points at the sitemap. |
| `sitemap.xml` | One entry — the site is a single page. |

## `src/` — application code

| File | What it does |
| --- | --- |
| `main.tsx` | Entry point. Mounts `App` into `#root`, loads the stylesheet, attaches Vercel Analytics and Speed Insights. |
| `App.tsx` | The whole page: holds the five pieces of state everything derives from, syncs the URL and document title, and lays out the controls, ramps, tokens, and footer. Also contains the small local components — icon buttons, theme toggle, share button, export modal, and the machine-readable palette block for agents. |
| `index.css` | Global stylesheet. Imports the self-hosted fonts, defines the Tailwind v4 theme (`paper`/`ink`/`ash`/`line` color tokens), and flips those tokens for dark mode. |
| `vite-env.d.ts` | Vite's ambient type declarations. |

### `src/lib/` — the logic, no UI

| File | What it does |
| --- | --- |
| `color.ts` | The engine. Converts a hex to OKLCH and builds an 11-step ramp (50–950) using a fixed lightness curve and a bell-curve chroma multiplier, clamping each result back into sRGB. Also builds the tinted neutral ramp and computes contrast for the swatch labels. |
| `recommend.ts` | Decides *which* colors to generate. Rotates the brand hue by the chosen scheme to derive accents, picks status hues, and pushes any status hue that lands too close to a palette hue out of the way. Exports `SCHEMES` and `buildPalette`. |
| `semantics.ts` | Maps ramp steps onto usage-first token names (surface, border, text, interactive states) for both light and dark, nudging steps as needed so every paired foreground clears the selected WCAG target, then serializes the result — `toCss`, `toTailwind`, `toFigma` (W3C DTCG), and `toJson`. These exporters are the canonical output format; everything else renders from them. |
| `share.ts` | Encodes the five inputs into a query string and decodes them back, validating each field independently so a malformed link falls back to defaults instead of breaking. |
| `site.ts` | The canonical site origin, used to build absolute share URLs. Overridable via `VITE_SITE_URL`. |
| `clipboard.ts` | `copyToClipboard` plus the `useCopy` hook that drives the "Copied" confirmations. |
| `utils.ts` | `cn()` — merges Tailwind class names via clsx + tailwind-merge. |

### `src/components/` — presentational pieces

| File | What it does |
| --- | --- |
| `ColorInput.tsx` | The brand and accent pickers: swatch, hex field, and the lock/reset behavior for overriding the auto-derived accent. |
| `SchemeSelect.tsx` | The derivation dropdown (complementary, analogous, triadic, split, monochromatic) with its descriptions. |
| `RampGroup.tsx` | Renders a titled group of ramps as rows of swatches, each with an include/exclude checkbox beside its name. |
| `SemanticTokens.tsx` | The semantic token table — token name, the ramp step it resolves to, light/dark previews, and a contrast badge whose pass threshold follows the selected WCAG level. |
| `ExportPanel.tsx` | The contents of the export modal. Opens on a choice between taking the tokens as code and copying an agent prompt. The code branch has a tab per format (CSS variables, Tailwind v4, Figma variables, JSON) with copy and download; the Figma tab emits one W3C DTCG file per mode. |
| `RowToggle.tsx` | The checkbox beside each ramp and token row, including the mixed-state variant used for section-level toggles. |
| `CopyButton.tsx` | Button that copies a value and crossfades to a checkmark. |
| `CopyText.tsx` | Inline text that copies itself when clicked. |

### `src/assets/`

| File | What it does |
| --- | --- |
| `avatar-ryan.webp` | Footer avatar, 96×96. |
| `logo-tktk.webp` | Footer studio logo, 96×96. |

Both are under Vite's inline threshold, so they're embedded as data URIs at
build time rather than fetched separately.

## `docs/`

| File | What it does |
| --- | --- |
| `DESIGN-NOTES.md` | The original build plans, kept as history — useful for understanding why the color math is shaped the way it is. |
