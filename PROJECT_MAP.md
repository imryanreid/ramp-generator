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

| File             | What it does                                                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build-icons.py` | Renders `public/icon-192.png` and `public/apple-touch-icon.png` from the shape in `favicon.svg`. Pure stdlib — no rasterizer dependency to draw four rounded bars.               |
| `sync-shared.sh` | Pushes `src/shared` to every sibling tool repo. `--check` diffs and exits non-zero instead — run it before any release. This repo is upstream, marked by `scripts/.is-upstream`. |

## `src/` — application code

| File            | What it does                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main.tsx`      | Entry point. Mounts `App` into `#root`, loads the stylesheet, attaches Vercel Analytics and Speed Insights, and removes the server-injected agent block once JavaScript is running.                     |
| `App.tsx`       | Ramps-specific wiring: the inputs everything derives from, the URL and title sync, and the controls. Page layout is `ToolShell`. Also holds the machine-readable palette block and the notation select. |
| `index.css`     | Imports the shared tokens, then the two things only this tool needs — the print rules behind the PDF export, and the react-colorful overrides.                                                          |
| `vite-env.d.ts` | This app's ambient types, including `VITE_SITE_URL`. Shared code brings its own.                                                                                                                        |

### `src/shared/` — the family layer, copied to every tool

Authored here and pushed outward with `scripts/sync-shared.sh`. **Never imports
from `src/lib/` or `src/components/`** — one direction only, which is what keeps
the copy mechanical. If a shared component needs tool-specific behaviour it
takes a prop.

| File                           | What it does                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| `tools.ts`                     | The tools manifest — the whole family in one list, plus `familyAsText()` for agent payloads.  |
| `tokens.css`                   | Fonts, the Tailwind theme, the five color tokens, dark mode, base styles, reduced motion.     |
| `motion.ts`                    | The pill spring, the panel easing, the duration scale, the hover-lift class.                  |
| `theme.ts`                     | `useTheme()` — light/dark state, persistence, and the `.dark` class on `<html>`.              |
| `utils.ts`                     | `cn()` — merges Tailwind class names via clsx + tailwind-merge.                               |
| `clipboard.ts`                 | `copyToClipboard` plus the `useCopy` hook behind every "Copied" confirmation.                 |
| `env.d.ts`                     | Vite client types, so `shared/` compiles without the host repo's declarations.                |
| `components/ToolShell.tsx`     | The three-row page: utility row, title row, control band, output, footer directory, colophon. |
| `components/ToolSwitcher.tsx`  | The family menu, hung off the eyebrow wordmark.                                               |
| `components/ToolDirectory.tsx` | The same list in the footer as plain anchors — the half that works without JavaScript.        |
| `components/Segmented.tsx`     | The segmented control and its spring pill. One component for what had been four skins.        |
| `components/Label.tsx`         | `Label` and `FieldLabel` — the family's one control-label treatment.                          |
| `components/IconButton.tsx`    | The 40px utility-row button: outline, solid, danger.                                          |
| `components/ThemeToggle.tsx`   | Sun/moon crossfade.                                                                           |
| `components/ResetButton.tsx`   | Reset that becomes its own undo for 3.5 seconds.                                              |
| `components/ShareButton.tsx`   | Copies a link and crossfades to a check. Takes a finished URL, not a state object.            |
| `components/ExportModal.tsx`   | The dialog shell the export flow renders into.                                                |
| `components/CopyText.tsx`      | Inline text that copies itself.                                                               |
| `components/CopyButton.tsx`    | Icon button that copies and crossfades to a check.                                            |
| `components/RowToggle.tsx`     | The per-row export checkbox, including the mixed state.                                       |
| `components/Attribution.tsx`   | The colophon, plus the two images it uses in `shared/assets/`.                                |

### `src/lib/` — the color logic, no UI

| File                | What it does                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `color.ts`          | The engine. Hex to OKLCH, the 11-step ramp from a fixed lightness curve and a bell-curve chroma multiplier, gamut clamping, the tinted neutral, contrast helpers, and `formatColor`. |
| `recommend.ts`      | Decides _which_ colors to generate: scheme rotations, status hues, hue-collision avoidance. Exports `SCHEMES` and `buildPalette`.                                                    |
| `semantics.ts`      | The semantic token contract, `resolveTokens` (the WCAG-driven step search), and the canonical exporters — `toCss`, `toTailwind`, `toFigma`, `toJson`.                                |
| `semantics.test.ts` | 68 cases over `resolveTokens`: the contrast guarantee, what may and may not move, scope, and collision reporting.                                                                    |
| `params.ts`         | The URL contract. Free of browser and Vite globals so `api/` can import it.                                                                                                          |
| `share.ts`          | Browser-side helpers over `params.ts` — absolute share URLs and reading state from `window.location`.                                                                                |
| `agent.ts`          | Turns a query string into the agent payload, as JSON and as plain text — now including the rest of the family. Shared by both functions.                                             |
| `agent.test.ts`     | Asserts what a JavaScript-less reader receives, since a browser can't prove anything here.                                                                                           |
| `site.ts`           | The canonical site origin. Overridable via `VITE_SITE_URL`.                                                                                                                          |

### `src/components/` — ramps-specific UI

| File                 | What it does                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ColorInput.tsx`     | The brand and accent pickers: swatch, react-colorful popover, hex field, and the saturation chip (NATURAL/BOLD) that governs the derived accents. |
| `SchemeSelect.tsx`   | The derivation dropdown with its descriptions. Also reports the pinned state by reading "Manual" and heading the menu with an explanation.        |
| `RampGroup.tsx`      | A titled group of ramps as rows of swatches, each with an include/exclude checkbox.                                                               |
| `SemanticTokens.tsx` | The token table — name, resolved step, light/dark previews, and a contrast badge.                                                                 |
| `ExportPanel.tsx`    | The export modal's contents: the code-vs-agent-prompt choice, then a tab per format.                                                              |

## `docs/`

| File              | What it does                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `share.png`       | The social card, committed so the README renders without depending on the deployment being up. Regenerate from `/api/og` if the design changes. |
| `DESIGN-NOTES.md` | The original build plans, kept as history — useful for understanding why the color math is shaped the way it is.                                |
