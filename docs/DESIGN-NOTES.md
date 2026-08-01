# Share Links (current task)

## Context
The ramp generator's entire output is derived deterministically from four inputs held in `App.tsx` (`brand`, `accentOverride`, `mode`, `scheme` — `src/App.tsx:13–16`); everything else is recomputed by `buildPalette`. This means a shared palette needs no backend, database, or IDs — the four values fit in a URL. We want a **Share** button that encodes the current inputs into a link and copies it, and load-time hydration so opening such a link reproduces the exact palette. Caveat surfaced to the user and accepted: the link is only externally shareable once the app is deployed to a stable URL (the Make preview iframe uses a per-session proxy URL); it still round-trips locally.

## Approach

### New util: `src/lib/share.ts`
- `type ShareState = { brand: string; accentOverride: string | null; mode: DsMode; scheme: Scheme }` (import types from `./recommend`).
- `encodeShareState(s): string` — build `URLSearchParams` with short keys: `b` (brand hex, no `#`), `a` (accent hex no `#`, omitted when `null`/auto), `m` (`full`|`basic`), `s` (scheme id). Return the query string.
- `shareUrl(s): string` — `${location.origin}${location.pathname}?${encodeShareState(s)}`. Build from state (not `location.search`) so it works inside the sandboxed iframe.
- `decodeShareState(search): Partial<ShareState>` — parse and **validate each field independently**, dropping invalid ones so a bad param never breaks load:
  - hex via regex `/^[0-9a-fA-F]{6}$/` (re-prefix `#`).
  - `mode` must be `"full"|"basic"`.
  - `scheme` must match an id in `SCHEMES` (`src/lib/recommend.ts:63`).
- `readInitialShareState(): Partial<ShareState>` — `decodeShareState(window.location.search)`, guarded for no-window.

### Wire into `App.tsx`
- Lazy-init the four `useState`s from `readInitialShareState()` merged over current defaults (e.g. `useState(() => init.brand ?? "#3d7dff")`). Call `readInitialShareState()` once above the state.
- Add a `useEffect` on `[brand, accentOverride, mode, scheme]` that calls `history.replaceState(null, "", "?" + encodeShareState(...))` to keep the address bar in sync (nice-to-have; harmless in iframe).
- Add a **Share** control in the controls row next to Export (`src/App.tsx:72–81`), as its own `<SectionLabel>Share</SectionLabel>` + button styled as a secondary of the Export button (outline/ghost, not solid `bg-ink`, keeping Export the primary CTA). Use the existing `useCopy` hook (`src/lib/clipboard.ts`) to copy `shareUrl(...)` and crossfade the label to a check + "Copied" on success (mirror the `CopyButton` crossfade pattern already in the repo).

## Reuse
- `copyToClipboard` / `useCopy` — `src/lib/clipboard.ts` (already handles the sandbox `execCommand` fallback).
- `SCHEMES` ids + `DsMode`/`Scheme` types — `src/lib/recommend.ts`.
- Check-swap animation pattern — mirror `src/components/CopyButton.tsx`.

## Verification
- `npx tsc --noEmit` clean.
- In preview: set a non-default brand, lock an accent, switch scheme + scope → address bar query updates. Click Share → button shows the check/"Copied".
- Paste the copied URL into a fresh reload → the four controls and the full palette return identically.
- Malformed URL (`?b=zzz&s=bogus`) → app loads on defaults without error.

---

# Color Ramp Generator (original build — historical)

## Context

The user wants a comprehensive color ramp generator to bootstrap a design system. Today the scaffold only renders a placeholder dot-grid in `src/App.tsx`. We are building a real tool from scratch that (1) accepts user-chosen primary colors, (2) generates perceptually-even Tailwind-style ramps for them, (3) recommends additional colors (accents, neutral, status) with their own ramps, and (4) maps semantic tokens onto ramp steps and exports them.

Decisions confirmed with the user:
- **Ramp scale:** Tailwind-style `50 → 950` (11 steps).
- **Recommendations:** a UI **toggle** between a *Full DS set* (harmony accents + tinted neutral + all four status colors) and *Quick/basic* (tuned neutral + status colors only).
- **Export:** all of CSS variables, Tailwind v4 `@theme`, and W3C-style JSON design tokens (tabbed panel with copy buttons).

## Aesthetic

Editorial-precise "instrument": true-white ground so generated colors are the only saturated elements; Fraunces (display serif) headings, Inter (sans) UI, JetBrains Mono for hex/token strings. All Google Fonts via `@import` at the top of `src/index.css`.

## Color engine (the core — get this right)

Generate ramps in **OKLCH** for perceptual evenness (naive HSL ramps go muddy/uneven). Use the **`culori`** library for reliable conversions (parse hex, sRGB⇄OKLCH, WCAG contrast) rather than hand-rolling matrices — install it as a dependency.

**Ramp algorithm** (`src/lib/color.ts`):
- Fixed lightness targets per step, tuned to Tailwind's feel, e.g. `50:0.97, 100:0.94, 200:0.88, 300:0.80, 400:0.70, 500:0.62, 600:0.54, 700:0.46, 800:0.38, 900:0.30, 950:0.22` (OKLCH L).
- Keep the base color's **hue**; apply a small chroma bell curve (peak in the 400–600 mids, tapering toward 50 and 950) scaled by the base's own chroma so vivid inputs stay vivid and muted inputs stay muted.
- Snap the input color to its nearest step by lightness and label the ramp with which step is the "source".
- Clamp out-of-gamut results back into sRGB; output hex + oklch string per step.

**Recommendations** (`src/lib/recommend.ts`):
- Harmony accents: rotate primary hue for complementary (+180°) and analogous/triadic options; pick 1–2 that read distinct from the primary.
- Tinted neutral: near-zero chroma ramp sharing the primary hue (gives a gray that belongs to the palette).
- Status colors: semantic anchor hues — success ~145°, warning ~85°, error ~27°, info ~250° — each run through the same ramp engine. Nudge chroma toward the palette's overall saturation for cohesion.
- Full DS = accents + neutral + status; Quick/basic = neutral + status only. Toggle controlled in `App.tsx` state.

**Semantic mapping** (`src/lib/semantics.ts`):
- Map tokens to ramp+step for both light and dark: `background, surface, surface-raised, border, border-strong, text, text-muted, primary, primary-hover, primary-foreground, accent, ring, success/warning/error/info (+ -foreground)`.
- Compute WCAG contrast for text-on-surface and foreground-on-fill pairs; show AA pass/fail badges so mappings are trustworthy.
- Export serializers here: CSS `:root{--primary-500: ...}` (+ `.dark`), Tailwind v4 `@theme { --color-primary-500: ... }`, and JSON `{ "primary": { "500": { "$value": "#..." } } }`.

## UI (`src/App.tsx` + `src/components/`)

- **Input panel:** add/remove primary colors; each with hex text field + native `<input type=color>` swatch; validate hex. Seed with one sensible default color.
- **Mode toggle:** Full DS ↔ Quick/basic.
- **Ramp display:** one section per group (Primaries, Accents, Neutral, Status). Each ramp = row of 11 swatches with step label, hex in mono, click-to-copy, and a small contrast indicator dot. Mark the source step.
- **Semantic tokens table:** token name (mono) → mapped swatch → light/dark values → AA badge.
- **Export panel:** tabs for CSS / Tailwind / JSON, code shown in mono, copy button per tab.
- Responsive: collapse to single column around ~1000px; ramps stay horizontally legible (scroll if needed). Hidden-until-scroll scrollbars.

## Files

- `src/lib/color.ts` — OKLCH conversions (via culori), ramp generation, contrast helpers.
- `src/lib/recommend.ts` — harmony accents, tinted neutral, status colors.
- `src/lib/semantics.ts` — token map + CSS/Tailwind/JSON serializers.
- `src/components/ColorInput.tsx`, `RampRow.tsx`, `RampGroup.tsx`, `SemanticTokens.tsx`, `ExportPanel.tsx`, `ModeToggle.tsx`.
- `src/App.tsx` — state (primaries, mode) + layout composition.
- `src/index.css` — font `@import`s, base ground/typography tokens.
- `package.json` — add `culori`.

## Verification

- Dev server is already running on `$PORT`; open the preview.
- Enter a primary hex → confirm an 11-step ramp appears, perceptually even, with the source step marked.
- Toggle Full DS vs Quick/basic → accent ramps appear/disappear; neutral + status always present.
- Check semantic table AA badges look sane (e.g. text-on-background passes).
- Copy each export tab → confirm CSS/Tailwind/JSON are well-formed and contain every ramp step.
- Narrow the window past ~1000px → layout collapses cleanly.
