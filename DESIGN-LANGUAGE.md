# Design Language

> **What this file is for:** The shared visual and interaction language of the
> Studio Tools family, reverse-engineered from ramps.studio — the first tool
> built in it. It records what the language _is_ (tokens, rhythm, control
> patterns, motion), what belongs to every tool versus what is genuinely about
> color, and what should change in ramps so the family coheres. It is
> descriptive first and prescriptive second. Not a spec for any one tool — see
> each repo's `SPEC.md` for that, and `PROJECT_MAP.md` for file inventories.

Derived from ramps.studio at commit `f880adb`, read in source and exercised
running locally in light and dark, desktop and mobile.

**Reconciled 2026-08-10, while starting Beeps.** Much of what §11 proposed has
since shipped: `src/shared/` exists and fans out to every tool, motion tokens
are named, `Segmented` and `Label` are extracted, and both Ramps and Motion have
test suites. The _descriptions_ below (§§2–8) remain accurate and are the
authority on the visual language. The _task lists_ (§9, §11) are annotated with
what is done — read them as a ledger, not as a to-do list.

---

## 1. Stack and build

| Thing           | Choice                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Framework       | React 19, no router, one page                                                                                              |
| Bundler         | Vite 8, `@vitejs/plugin-react`                                                                                             |
| Styling         | Tailwind CSS v4 via `@tailwindcss/vite` — **CSS-first**, `@theme` block in `src/index.css`, no `tailwind.config.js`        |
| Language        | TypeScript, `strict: true`, `noEmit` (Vite builds)                                                                         |
| Package manager | pnpm 10.34.3, Node 22, pinned in `.mise.toml`                                                                              |
| Formatter       | Prettier + `prettier-plugin-tailwindcss`. `semi: false`, double quotes, `printWidth: 96`, `trailingComma: "all"`           |
| Linter          | **None installed.** Two `eslint-disable-next-line` comments exist in `App.tsx` referencing a linter that isn't in the tree |
| Tests           | Vitest. 93 in Ramps, 288 in Motion — `lib/` only, since it is pure and framework-free                                      |
| Deploy          | Vercel. No `vercel.json` — zero-config static build plus filesystem-routed functions                                       |
| Verify          | `pnpm build` = `tsc --noEmit && vite build`. Both must be clean                                                            |

**Runtime dependencies (13).** `react`, `react-dom`, `culori` (color math),
`motion` (animation), `clsx` + `tailwind-merge` (the `cn()` utility),
`@phosphor-icons/react` (icons), `react-colorful` (the picker), three
`@fontsource-variable/*` font packages, `@vercel/analytics`,
`@vercel/speed-insights`, `@vercel/functions`, `@vercel/og`.

Of those, **six are family-generic** (react, react-dom, motion, clsx,
tailwind-merge, phosphor), **three are fonts**, **two are color-specific**
(culori, react-colorful), and **four are Vercel platform** (analytics, speed
insights, functions, og).

### Not purely client-side

Worth stating plainly because the new tools' brief says 100% client-side:
ramps.studio **is not**. It ships three server pieces:

- `middleware.ts` — rewrites every `/` to `/api/render`
- `api/render.ts` — refetches the built `index.html` and injects the palette as
  both JSON and plain `<pre>` text, so agents that don't run JavaScript can read
  a share link
- `api/palette.ts` — the same payload as JSON
- `api/og.tsx` — per-palette social share images via `@vercel/og`

These are _pure_ functions of the query string — no state, no storage — so they
don't violate the spirit of "no backend". But they are Vercel-shaped, they can't
run from a filesystem, and they are the reason ramps can't be a plain static
bundle. **This is a family-level decision to make deliberately**, not inherit by
default. (See §8, item G.)

### File and naming conventions

- **Every file opens with a banner comment block** in a fixed style — a rule of
  equals signs, a SHOUTED TITLE, and two to six lines of plain-language
  explanation. Enforced by `CLAUDE.md`, honoured in all 20 source files.
- `src/lib/` holds logic and knows nothing about React rendering;
  `src/components/` renders and holds no math. Enforced by convention, honoured.
- Components are `PascalCase.tsx`, default-exported, one per file.
- Library modules are `lowercase.ts`, named exports only.
- **`src/lib/` and `api/` imports carry explicit `.js` extensions**
  (`from "./color.js"`) because Vercel's Node ESM resolver requires them.
  `src/components/` imports do not. This split is real and load-bearing.
- Small components used in exactly one place live at the bottom of the file that
  uses them (`App.tsx` holds `IconButton`, `ThemeToggle`, `ResetButton`,
  `ShareButton`, `ExportModal`, `SectionLabel`, `ComplianceToggle`,
  `FormatSelect`, `ModeToggle`, `Attribution`, `AgentData` — 933 lines total).
  Anything reused moves to `components/`.
- An `@` → `src/` alias is configured in both `vite.config.ts` and
  `tsconfig.json` and **is never used**. Every import is relative.

---

## 2. Type

Three self-hosted variable families, each with exactly one job. No overlap, no
fallback stack beyond a system default. Loaded from Fontsource; the CLAUDE.md
rule forbids any font CDN.

| Token            | Family                      | Job                                                                                |
| ---------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| `--font-display` | **Geist Variable**          | Headings only — `h1`, section `h2`, modal title, choice-card title                 |
| `--font-sans`    | **Inter Variable**          | Prose — the subhead, table cells, descriptions, tooltip copy                       |
| `--font-mono`    | **JetBrains Mono Variable** | Everything that is chrome or a value — labels, buttons, badges, code, step numbers |

That third rule is the strongest type decision in the app: **mono is the
interface, sans is the writing.** Every control label, every button label, every
color value, every table header is monospaced. Nothing about it is
"code-styled" in a themed way — it just reads as an instrument panel.

Cost: ~118 KB for the Latin subsets of three families. Documented as a known
trade in `NEXT-UP.md`; the lever, if load ever matters, is dropping to two.

### The scale as actually used

There is no declared type scale. Sizes are Tailwind defaults plus arbitrary
values, applied ad hoc. Written down, the working set is:

| Role               | Classes                                                           | Effective |
| ------------------ | ----------------------------------------------------------------- | --------- |
| Page title         | `font-display text-3xl leading-none font-semibold tracking-tight` | 30px      |
| Section heading    | `font-display text-xl font-semibold tracking-tight`               | 20px      |
| Modal title        | `font-display text-xl font-semibold tracking-tight`               | 20px      |
| Card title         | `font-display text-base font-semibold tracking-tight`             | 16px      |
| Body / subhead     | `text-sm leading-relaxed`                                         | 14px      |
| Table cell         | `text-sm`                                                         | 14px      |
| Token name         | `font-mono text-[13px]`                                           | 13px      |
| Code block         | `font-mono text-[12px] leading-relaxed`                           | 12px      |
| **Control label**  | `font-mono text-[11px] uppercase tracking-[0.14–0.2em]`           | **11px**  |
| Micro button       | `font-mono text-[11px]`                                           | 11px      |
| Agent code block   | `font-mono text-[11px] leading-relaxed`                           | 11px      |
| Swatch step number | `text-[10px] font-medium`                                         | 10px      |
| "base" chip        | `text-[8px] uppercase tracking-wide`                              | 8px       |

**11px uppercase mono is the workhorse.** It carries every label in the app.
Everything above 14px is Geist; everything at or below 13px is JetBrains Mono
with one exception (14px Inter table cells).

**Inconsistency:** the same visual idea — a small uppercase mono label — exists
in three variants with three tracking values and three bottom margins:

| Component                       | Tracking | Margin                   | Used by                             |
| ------------------------------- | -------- | ------------------------ | ----------------------------------- |
| Eyebrow (inline in `App.tsx`)   | `0.2em`  | `mb-1`                   | "RAMPS.STUDIO"                      |
| `SectionLabel` (`App.tsx`)      | `0.16em` | `mb-3`                   | Derivation, Format, Contrast, Scope |
| `FieldLabel` (`ColorInput.tsx`) | `0.14em` | `mb-1.5` + `h-4` wrapper | Brand, Accent                       |

The visible consequence: in the control row, `DERIVATION` sits about 7px higher
than `BRAND` and `ACCENT`. It reads as a bug at desktop width.

---

## 3. Color

The interface palette is **five tokens**, named after physical objects rather
than roles. This is the single most identity-carrying decision in the app.

```css
@theme {
  --color-paper: #fdfdfc; /* page */
  --color-ink: #16150f; /* text, solid fills */
  --color-ash: #6b6a63; /* secondary text */
  --color-line: #e6e5df; /* borders */
  --color-line-soft: #f0efe9; /* table row rules */
}

:root.dark {
  --color-paper: #131210;
  --color-ink: #f3f2ec;
  --color-ash: #9a998f;
  --color-line: #2d2b25;
  --color-line-soft: #211f1a;
}
```

Three things follow from this:

1. **Everything is warm.** `#fdfdfc` is a hair yellow; `#16150f` and `#131210`
   are warm near-blacks; `#e6e5df` is a warm grey. Nothing in the chrome is a
   pure neutral. Against that warmth, the generated palettes — which are
   arbitrary hues — read as _content_, sitting on paper.
2. **There are no more tokens, ever.** Everything else is an opacity derivative
   of `ink`. The full observed set: `bg-ink/[0.03]`, `/[0.04]`, `/[0.06]`,
   `/10`, `border-ink/20`, `/30`, `/40`, `ring-ink/15`, `ring-ink/30`,
   `bg-ink/[0.05]`, `bg-ink/[0.08]`, `ring-black/5`. Nine ad-hoc alpha values,
   no names.
3. **Dark mode is token substitution only.** There is not one `dark:` variant in
   the entire codebase. `<html>` gets a `.dark` class, five custom properties
   are redefined, and the whole page flips. `color-scheme` is set on both. This
   is clean, it is unusual, and it should be a family rule.

### The escape hatches

Seven places reach past the five tokens for a literal Tailwind palette color:

| Where                               | Color                                  | Purpose           |
| ----------------------------------- | -------------------------------------- | ----------------- |
| `CopyButton`                        | `text-emerald-600`                     | copied checkmark  |
| `ShareButton`                       | `text-emerald-500`                     | copied checkmark  |
| `IconButton` danger / `ResetButton` | `red-500` (border, text, `/[0.06]` bg) | destructive hover |
| `ColorInput`                        | `border-red-400`                       | invalid input     |
| `SemanticTokens` `CollisionWarning` | `text-amber-500`                       | warning glyph     |
| `SemanticTokens` `AA` badge         | `bg-emerald-100 text-emerald-700`      | contrast pass     |
| `SemanticTokens` `AA` badge         | `bg-amber-100 text-amber-700`          | contrast fail     |

**The last two are broken in dark mode.** `emerald-100` and `amber-100` are
near-white fills, which is fine on paper and glaring on a dark page. This is the
clearest unfinished edge in the app and the one a family layer should fix once,
in one place.

### Theme state

`getInitialTheme()`: `localStorage.theme` → `prefers-color-scheme` → light.
Written back to `localStorage` on every change. Deliberately **not** in the URL
— the URL carries the artifact, the theme is a viewing preference. Good rule;
keep it.

### One raw-CSS leak

`src/index.css` carries a scoped `.ramp-picker .react-colorful` block that
resizes and rounds the third-party picker (208×170, 6px saturation area, 999px
hue bar, 16px pointer). It is the only place styling escapes Tailwind, and it is
there because `react-colorful` ships its own stylesheet. Worth noting because it
is the kind of thing that will recur every time a tool takes a third-party
control.

---

## 4. Spacing rhythm

Not a scale — Tailwind's default 4px grid, used with a small vocabulary of
repeats. Written out:

```
Page shell        mx-auto max-w-[1400px] px-6 py-10  lg:px-10 lg:py-14
Header block      mb-8, gap-5 (mobile col-reverse) / gap-4
Controls block    mb-12 border-b pb-10
Control row       gap-x-8 gap-y-6, items-end
Section (ramps)   mb-12
  heading → body  mb-4
  row label → row mb-1.5
  row → row       gap-5
  swatch → swatch gap-1
Token table       py-2 pr-4 per cell; category heading pt-7 pb-1.5
Footer            mt-12 border-t pt-6
Modal             p-5 sm:p-6, mt-6 sm:mt-10, max-w-3xl
```

**`mb-12` (48px) is the section rhythm.** Everything major is separated by it.
Below that, `mb-4` / `mb-3` / `mb-1.5` handle heading-to-content at three levels
of tightness.

### Control heights

| Element                                              | Height                           |
| ---------------------------------------------------- | -------------------------------- |
| Top-right icon buttons (`IconButton`, `ResetButton`) | **40px** (`h-10 w-10`)           |
| Color swatch button                                  | 36px (`h-9 w-9`)                 |
| Hex input                                            | 36px (`h-9`)                     |
| Derivation dropdown                                  | 36px (`h-9`)                     |
| Format `<select>`                                    | ~30px (`py-1.5` + text)          |
| Segmented toggles                                    | ~30px (`py-1.5` + `p-0.5` frame) |

So there are effectively **three** control heights (40 / 36 / 30) in two
adjacent bands. The 40px action stack against the 36px control row is the
noticeable one.

---

## 5. Radii

A five-rung ladder that tracks nesting depth rather than component type:

| Radius          | Value | Used for                                                                                       |
| --------------- | ----- | ---------------------------------------------------------------------------------------------- |
| `rounded`       | 4px   | The moving pill inside a segmented control                                                     |
| `rounded-[4px]` | 4px   | `RowToggle` checkbox (arbitrary value for the same 4px — should be `rounded`)                  |
| `rounded-md`    | 6px   | Inputs, buttons, swatches, segmented-control frames, ramp swatches                             |
| `rounded-lg`    | 8px   | Choice cards, export terminal, agent `<details>`, picker popover                               |
| `rounded-xl`    | 12px  | The export modal                                                                               |
| `rounded-full`  | ∞     | Attribution chips, token value chips, `ViewToggle`, the Auto/Manual pill, the picker's hue bar |

The rule in practice: **6px is the default, +2px per level of containment, and
anything that reads as a _tag_ is a full pill.** That is a coherent system and
worth stating explicitly rather than leaving implicit.

---

## 6. Motion

`<MotionConfig reducedMotion="user">` wraps the entire app, so every `motion`
animation respects `prefers-reduced-motion` without per-site opt-in. CSS
transitions are not covered by that and are not gated — a gap, though at
120–300ms the exposure is small.

There are exactly **two** motion idioms.

### A. The spring pill

Six segmented controls animate a `layoutId` background between options, all with
the same transition object, copy-pasted six times:

```ts
transition={{ type: "spring", stiffness: 480, damping: 38 }}
```

`layoutId`s in use: `compliance-pill`, `mode-pill`, `agent-format-pill`,
`sem-view-pill`, `export-tab-underline`, `export-mode-pill`.

This is the app's signature animation and the only reason `motion` is a
dependency at all beyond the modal.

### B. CSS transitions for everything else

| Motion                                     | Timing                                              |
| ------------------------------------------ | --------------------------------------------------- |
| Color / border hover                       | `transition-colors` (Tailwind default 150ms)        |
| Button hover lift                          | `transition-all` + `hover:-translate-y-0.5`         |
| Icon crossfade (copy → check)              | inline style, `duration-200 ease-out`               |
| Theme toggle sun/moon                      | `duration-300 ease-out`, rotate ±90° + `scale(0.6)` |
| Reset → Undo width morph                   | `duration-300 ease-out`, 40px → 92px                |
| Caret rotate (open dropdown / `<details>`) | `transition-transform`, 200ms                       |
| Swatch hover                               | `hover:scale-[1.04]`                                |

### Modal and panel timings

| Element           | Duration | Easing               | Transform                      |
| ----------------- | -------- | -------------------- | ------------------------------ |
| Backdrop          | 0.2s     | `easeOut`            | opacity                        |
| Modal panel in    | 0.24s    | `[0.22, 1, 0.36, 1]` | `y: 12 → 0`, `scale: 0.98 → 1` |
| Modal panel out   | 0.24s    | same                 | `y: 0 → 8`, `scale: → 0.985`   |
| Export stage swap | 0.16s    | `easeOut`            | `y: 6 → 0 → -4`                |
| Code block swap   | 0.14s    | `easeOut`            | opacity                        |

`[0.22, 1, 0.36, 1]` is the only custom bezier in the codebase.

### The hover language

**`hover:-translate-y-0.5` — a 2px lift — is the entire raised-affordance
vocabulary.** It is on every icon button, both choice cards, and both
attribution chips. Nothing scales, nothing shadows on hover (the export button
has a static `shadow-sm`). Two pixels, everywhere, is the whole idea.

### There are no motion tokens

Every duration, easing and spring constant is a literal at its call site. Six
copies of the same spring. This is the most obvious thing for a shared layer to
absorb — and, since the second tool in the family is a motion token generator,
faintly ironic.

---

## 7. Layout shell, control patterns, export panel

### 7.1 Shell

One column, `max-w-[1400px]`, centred, no sidebar, no sticky anything, no nav.
Vertically:

```
┌ header row ─────────────────────────────────────────────┐
│ eyebrow (RAMPS.STUDIO, mono uppercase 11px/0.2em)       │
│ h1 (Geist 30px semibold)          [☾] [↺] [🔗] [⬇]      │
│ subhead (Inter 14px ash, max-w-[52ch])   ← action stack │
├ control row (flex-wrap, items-end, gap-x-8 gap-y-6) ────┤
│ Brand │ Accent ─── Derivation │ Format │ Contrast │Scope│
╞═════════════════════════ border-b ══════════════════════╡
│ Brand      (1 ramp)                                     │
│ Accents    (2 ramps)     ← RampGroup ×4, mb-12 each     │
│ Neutral    (1 ramp)                                     │
│ Status     (4 ramps)                                    │
│ Semantic tokens  (table, ~45 rows, 6 columns)           │
│ ▸ Machine-readable palette (for agents)   ← <details>   │
│ ─── Built by [Ryan Reid] at [tktk studio]               │
└─────────────────────────────────────────────────────────┘
```

Proportions worth keeping: the controls occupy one band above a rule and never
more; everything below the rule is output; there is no chrome below the fold.

On mobile the header row is `flex-col-reverse`, so the action stack lands
_above_ the title, left-aligned. It works but reads oddly — four floating
buttons with nothing to anchor them.

### 7.2 The Accent ↔ Derivation binding

The most distinctive layout detail in the app. Accent and Derivation share a
flex wrapper so they wrap together, with a literal hairline between them:

```tsx
<div className="mb-[17px] hidden h-px w-8 shrink-0 transition-colors sm:block
                ${accentLocked ? "bg-transparent" : "bg-line"}" />
```

A 32×1px div that fades out when the accent is pinned, because at that moment
Derivation stops producing it. Simultaneously, Derivation drops to
`opacity-45` — dimmed but still clickable, with a `title` explaining that it
still shapes accent-2, the neutral tint and the status vividness.

That is _a lot_ of care spent on communicating a dependency between two
controls. It is also the single best example of this app's personality: the UI
argues with you about what it's doing.

### 7.3 Control patterns

| Pattern              | Implementation                                                                                                                          | Notes                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Segmented toggle** | `<div class="inline-flex rounded-md border p-0.5">` + buttons + `layoutId` pill                                                         | Four skins — see below                                                                                                                 |
| **Native select**    | `<select appearance-none>` + absolutely positioned `CaretDown`                                                                          | Format only                                                                                                                            |
| **Custom dropdown**  | `SchemeSelect` — button + absolute panel, outside-click and Escape close, each option carries a `blurb`                                 | Derivation only                                                                                                                        |
| **Color field**      | 36px swatch button (opens `react-colorful` popover) + text input                                                                        | Compact value at rest (`62% 0.205 262.4`), full CSS string on focus, `select()` on focus, commits on blur/Enter, red border on invalid |
| **Auto/Manual pill** | Tiny `rounded-full bg-ink/[0.06]` mono uppercase chip in the label row                                                                  | Sits in the label line, not the control line                                                                                           |
| **Row checkbox**     | `RowToggle` — real `<input type="checkbox" class="peer sr-only">` inside a `<label>`, styled `<span>`, supports `indeterminate` via ref | Fully keyboard/SR accessible                                                                                                           |
| **Icon button**      | 40px square, three variants: `outline`, `solid`, `danger`                                                                               | All lift 2px on hover                                                                                                                  |
| **Morphing button**  | `ResetButton` — one element eases 40→92px and crossfades icon → "↺ Undo?" for 3.5s                                                      | The undo _is_ the confirmation                                                                                                         |

**Segmented controls have four different skins for one interaction:**

| Instance                            | Frame                            | Pill                         | Text                |
| ----------------------------------- | -------------------------------- | ---------------------------- | ------------------- |
| Contrast, Scope, Agent-block format | `rounded-md border-line p-0.5`   | `bg-ink rounded`             | active `text-paper` |
| Token table Hex/Ramp (`ViewToggle`) | `rounded-full border-line p-0.5` | `bg-ink/[0.08] rounded-full` | active `text-ink`   |
| Export format tabs                  | none (flush row)                 | `bg-paper` 2px underline     | active `text-paper` |
| Figma light/dark                    | `rounded border-white/15 p-0.5`  | `bg-white/15 rounded`        | active `text-paper` |

All four use the same spring. None share a component.

### 7.4 Copy affordances

Three components, one hook (`useCopy`, `src/lib/clipboard.ts` — async Clipboard
API with an `execCommand` fallback for sandboxed iframes).

| Component                 | Feedback                                                              | Where                                        |
| ------------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| `CopyText` (default)      | floating `bg-ink` tooltip above, "copied"                             | inline values                                |
| `CopyText` (render-prop)  | caller decides — ramp swatches crossfade the step number to a `Check` | swatch grid                                  |
| `CopyText` (`swapOnCopy`) | label replaced by "✓ copied"                                          | export panel buttons                         |
| `CopyButton`              | icon crossfades `Copy` → green `Check`                                | table cells, hover-revealed via `group/cell` |
| `ShareButton`             | icon crossfades `LinkSimple` → green `Check`                          | header                                       |

Reset timings: `useCopy()` defaults to 1100ms; the share button and the agent
block pass 1400ms. No stated reason for the difference.

### 7.5 Export panel

**The modal opens on a question, not on tabs.** Two large choice cards:

```
┌─────────────────────────┐  ┌─────────────────────────┐
│ </>                     │  │ ✨                       │
│ Export code           › │  │ Copy agent prompt     › │
│ CSS variables, a        │  │ A ready-to-paste prompt │
│ Tailwind v4 theme,      │  │ with a link to this     │
│ Figma variables, or     │  │ palette, for Claude,    │
│ JSON. Copy or download. │  │ GPT, or any coding      │
└─────────────────────────┘  └─────────────────────────┘
```

That fork — _code_ vs _prompt for an agent_ — is the product thesis rendered as
a UI decision, and it should be the family pattern.

The code branch:

- A **dark "terminal" panel that stays dark in light mode and in dark mode.**
  Achieved by pinning `--color-ink` / `--color-paper` inline on the container:
  ```tsx
  style={{ "--color-ink": "#16150f", "--color-paper": "#fdfdfc" }}
  ```
  Elegant — the token indirection means one inline style re-themes the subtree.
- Tab row on the left (`CSS · Tailwind · Figma · JSON`), `download` and `copy`
  on the right, both as `border-white/15` mono 11px lowercase buttons.
- `<pre>` at `max-h-[60vh] overflow-auto`, `text-[12px] text-white/85`.
- **No syntax highlighting.** Deliberate — it would be a dependency, and the
  content is tokens, not code with structure worth colouring.
- Format-specific sub-bars appear when needed (Figma gets an explanation line
  plus a light/dark mode pill, because DTCG has no concept of modes and Figma
  imports one file per mode).
- Navigation back is a `← back` link in lowercase mono 11px, not a breadcrumb or
  an X.
- Content crossfades on tab change (0.14s), keyed on `${tab}-${colorMode}`.

The prompt branch is the same terminal with a header line
("Paste into any agent that can open a link") and a `copy prompt` button, plus a
footnote pointing at Export code for agents that can't browse.

**Dead but wired:** PDF export. The print stylesheet is complete and committed
(`@media print` in `index.css`, ~50 lines, hanging on
`print-color-adjust: exact`), `onPrint` is threaded from `App.tsx` through
`ExportPanel` into `Chooser` — where it is destructured and ignored, with a
comment saying the output needs design work before it earns a menu slot. It
typechecks because the prop is declared and dropped.

### 7.6 The agent block

A `<details>` at the bottom of the page, mono 11px summary, containing:

- a `#`-prefixed legend explaining the whole URL contract and this palette's
  exact parameters,
- a JSON/CSS segmented toggle,
- a copy button,
- the full serialized palette.

Plus the server-side story: `middleware.ts` → `api/render.ts` injects the same
payload as an unstyled `<div id="agent-palette">` containing both a
`<script type="application/json">` and a visible `<pre>`, which `main.tsx`
removes on mount. Both shapes ship because HTML-to-markdown conversion strips
`<script>`, and the block carries no `display:none` because readability
extractors honour inline hiding.

This is not a design detail — it is the product. Any tool in this family gets
the same treatment.

---

## 8. What is deliberately weird, and worth preserving

Named specifically, because "keep the personality" is unactionable and these are
the actual load-bearing choices:

1. **Physical-object color names.** `paper` / `ink` / `ash` / `line` /
   `line-soft`, not `background` / `foreground` / `muted` / `border`. Five
   tokens, no more.
2. **Warm neutrals throughout.** Nothing is `#fff`, `#000`, or a true grey.
3. **Mono is the interface; sans is the writing; Geist is the headings.** Three
   families, three jobs, zero overlap.
4. **Lowercase mono micro-labels** — `copy`, `download`, `back`, `copied`,
   `not exported` — sitting next to Title Case headings. Deliberately
   unbalanced, and it reads as a tool rather than a product page.
5. **Letterspaced uppercase mono eyebrows** at 11px / 0.14–0.2em.
6. **The vanishing hairline** between Accent and Derivation.
7. **`hover:-translate-y-0.5` as the entire hover language.** 2px, everywhere.
8. **One spring** (`stiffness: 480, damping: 38`) for every pill.
9. **The reset button that becomes its own undo** for 3.5 seconds, morphing
   width rather than swapping elements.
10. **Machine-readability as a visible design surface** — the agent block is on
    the page, not behind a link, and the export modal's first question is
    "code or prompt?".
11. **Tooltips that explain constraints, not errors.** The collision warning
    writes a sentence about why AAA squeezes a three-level text hierarchy,
    rather than flagging a problem.
12. **The codebase argues with itself.** Every non-obvious decision carries a
    paragraph explaining the alternative that was rejected and why —
    `.` vs `,` as a URL separator, names vs a bitmask, why the agent block can't
    use `display:none`, why scoring on the background alone flips a button's
    label. This is unusual and genuinely valuable; it should be a family
    standard.
13. **The export terminal pins itself dark in both themes.**
14. **Per-row export selection.** The output is curated, not all-or-nothing —
    and exclusions are applied _after_ the math, never before.
15. **Honest failure.** When a contrast target can't be reached, the tool takes
    the best available and badges the shortfall rather than faking a pass, and
    the agent payload names its own exceptions.

That last one is a _stance_, not a style, and it transfers directly to Motion
Studio's cross-platform honesty requirement.

---

## 9. What is unfinished, inconsistent, or a shortcut

Ordered roughly by how much they'd bother you. Status as of 2026-08-10 —
✅ fixed, ⬜ still open.

| #   | Status                                                | Issue                                                                                                                                                                                                                                                  | Where                                              |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1   | ⬜ still open                                         | **Contrast badges are near-white in dark mode** — `bg-emerald-100 text-emerald-700` / `bg-amber-100 text-amber-700` never flip. Still the one a visitor would notice.                                                                                  | `SemanticTokens.tsx:329`                           |
| 2   | ✅ fixed — one `Label`                                | **Three label components, three trackings, three margins** → visible baseline misalignment in the control row                                                                                                                                          | `App.tsx:810`, `ColorInput.tsx:106`, `App.tsx:270` |
| 3   | ✅ fixed — one `Segmented`                            | **Four skins for one segmented control**                                                                                                                                                                                                               | §7.3                                               |
| 4   | ⬜ still open                                         | **Three control heights** (40 / 36 / 30) in two adjacent bands                                                                                                                                                                                         | §4                                                 |
| 5   | ⬜ still open                                         | **Two dropdown implementations** — native `<select>` for Format, custom for Derivation                                                                                                                                                                 | `App.tsx:870`, `SchemeSelect.tsx`                  |
| 6   | ⬜ still open                                         | **PDF export is complete, wired, and unreachable**; `Chooser` takes `onPrint` and ignores it                                                                                                                                                           | `ExportPanel.tsx:156`                              |
| 7   | ✅ fixed — `shared/motion.ts`                         | **No easing/duration/spring tokens** — six copies of one spring, every timing inline                                                                                                                                                                   | everywhere                                         |
| 8   | ✅ fixed — named in `tokens.css`                      | **Nine unnamed alpha values** on `ink` doing the work of a surface scale                                                                                                                                                                               | everywhere                                         |
| 9   | ⬜ still open in Ramps; Motion sets `base: "./"`      | **Built output can't be opened from the filesystem** — Vite's default `base: "/"` emits `/assets/…`                                                                                                                                                    | `vite.config.ts`                                   |
| 10  | ⬜ still open                                         | **Four names for one thing** — `package.json` says `color-ramp-generator`, the repo is `ramp-generator`, the folder is `Ramps Studio`, the `<h1>` says "Color Ramp Generator", `og:site_name` says "Ramps Studio", the README H1 says "Ramp Generator" | root                                               |
| 11  | ✅ fixed                                              | **Dead import** — `allRamps` imported into `App.tsx`, never used                                                                                                                                                                                       | `App.tsx:38`                                       |
| 12  | ⬜ still open                                         | **`@` alias configured, never used**                                                                                                                                                                                                                   | `vite.config.ts`, `tsconfig.json`                  |
| 13  | ⬜ still open                                         | **`eslint-disable` comments with no ESLint installed**                                                                                                                                                                                                 | `App.tsx:195,230`                                  |
| 14  | ✅ fixed — `semantics.test.ts` covers `resolveTokens` | **No tests.** `resolveTokens` is ~100 lines of subtle three-stage search with no coverage at all                                                                                                                                                       | `semantics.ts:382`                                 |
| 15  | ⬜ still open                                         | **`useCopy` has two reset durations** (1100 / 1400) with no stated reason                                                                                                                                                                              | `clipboard.ts:40`                                  |
| 16  | ✅ fixed — the media query is in `tokens.css`         | **CSS transitions aren't reduced-motion gated** — `MotionConfig` only covers `motion` components                                                                                                                                                       | `index.css`                                        |
| 17  | ✅ fixed — the mobile pass, PRs #9–#11                | **Mobile: side-by-side accent fields truncate**; action stack floats above the title unanchored                                                                                                                                                        | observed at 390px                                  |
| 18  | ⬜ still open                                         | **`rounded-[4px]`** used where `rounded` is the same value                                                                                                                                                                                             | `RowToggle.tsx:45`                                 |
| 19  | ⬜ still open                                         | **A stale `dist/`** sits in the working tree (gitignored, but present and out of date)                                                                                                                                                                 | root                                               |

None of these are bugs in the product. #1 is the only one a visitor would
notice; #14 is the only one that would let a real bug through.

---

## 10. (a) Generic vs. ramps-specific

### Genuinely generic — belongs to every tool

**Visual foundation**

- The five color tokens and their light/dark values
- The `.dark`-class, token-substitution theming model, and `getInitialTheme()`
- The three-family type assignment and the 11px-mono-label rule
- The radius ladder (4 / 6 / 8 / 12 / full)
- The spacing rhythm (`mb-12` sections, `max-w-[1400px] px-6 py-10 lg:px-10 lg:py-14`)
- The motion vocabulary: the pill spring, the 2px hover lift, the modal
  timings, the custom bezier

**Components, verbatim**

- `cn()` (`lib/utils.ts`)
- `useCopy` + `copyToClipboard` (`lib/clipboard.ts`)
- `CopyText`, `CopyButton`
- `RowToggle`
- `IconButton`, `ThemeToggle`, `ResetButton`, `ShareButton` (currently trapped
  in `App.tsx`)
- `ExportModal` shell
- `Label` — the unified `SectionLabel` / `FieldLabel` ✅ shipped
- `Segmented` — the four skins, extracted into one with a `variant` prop
  ✅ shipped

**Patterns, re-implemented per tool but identically shaped**

- The page shell: eyebrow → h1 → subhead → action stack → control band →
  rule → output → agent block → attribution footer
- The export modal's _code vs. agent prompt_ fork
- The dark terminal panel with pinned ink/paper
- Format tabs + download + copy + `max-h-[60vh]` pre
- Per-row export selection (checkbox per row, exclusions applied after
  computation)
- The visible agent `<details>` block
- `<MotionConfig reducedMotion="user">` at the root

**Infrastructure, structurally identical**

- URL-as-state: `params.ts`'s shape — `DEFAULT_STATE`, `encodeShareState`,
  `decodeShareState` validating each field independently so a bad link degrades
  rather than errors, `resolveShareState`
- The `.`-separated name-list convention for multi-value params
- `shareUrl()` / `SITE_URL` / `VITE_SITE_URL` override
- `history.replaceState` sync, stripping the query string at defaults
- Document title + description sync
- The agent payload shape: `{ $schema, generator, source, input, …, notes }`
  and the parallel plain-text rendering
- `llms.txt`, `robots.txt`, `sitemap.xml` shapes; the JSON-LD block
- `middleware.ts` + `api/render.ts` + `api/palette.ts` (if kept — see §8.G)
- `api/og.tsx`
- Build config, Prettier config, `.mise.toml`, `tsconfig.json`, `.gitignore`
- The doc set: `CLAUDE.md`, `PROJECT_MAP.md`, `NEXT-UP.md`
- The banner-comment convention and the `lib/` vs `components/` split
- The `.js`-extension rule for `lib/` and `api/`
- The Attribution footer

### Genuinely ramps-specific

- **All of `lib/color.ts`** — OKLCH conversion, the `LIGHTNESS` and
  `CHROMA_CURVE` tables, gamut clamping, `readableText`, WCAG contrast
- **All of `lib/recommend.ts`** — scheme rotations, status hues, collision
  avoidance
- **`lib/semantics.ts`'s token contract and `resolveTokens`** — though its
  _exporter_ structure (`toCss` / `toTailwind` / `toFigma` / `toJson`) is a
  generic shape with color-specific bodies
- `ColorInput`, `SchemeSelect`, `RampGroup`, `SemanticTokens`
- `culori`, `react-colorful`
- The `.ramp-picker` CSS block
- The WCAG AA/AAA control and everything downstream of it
- The specific URL params (`b`, `a`, `a2`, `s`, `c`, `f`, `xr`, `xt`)
- The favicon shape (a five-step ramp) and `scripts/build-icons.py`

### Ambiguous — decide deliberately

- **`ExportPanel`.** The chrome is generic; the format list and serializers are
  not. Right answer is a generic `<ExportPanel formats={…} />` that takes
  `{ id, label, filename, mime, render() }` plus an optional sub-bar slot.
- **`toFigma` / DTCG.** Every tool wants DTCG JSON. The _emitter_ is generic;
  `$type: "color"` and the sRGB component structure are not. Extract a DTCG
  writer that takes typed leaves.
- **`agent.ts`.** The payload _envelope_, the notes mechanism, and the text
  renderer are generic. The notes' content is not. Extract the envelope.
- **The `SemanticTokens` table.** Motion Studio has no equivalent; Shape's
  radius/spacing tables would. Don't extract until a second tool needs it.

---

## 11. (b) Changes to ramps, ranked

Value-to-effort, highest first. **Deploy-risk flags:** 🟢 no user-visible
change · 🟡 visible but safe · 🔴 touches the URL contract, the agent payload,
or SEO — needs a no-JavaScript fetch to verify.

### Tier 1 — ✅ all shipped

Done before Motion Studio, as intended. `src/shared/` exists and is fanned out
by `scripts/sync-shared.sh`; `shared/motion.ts` holds the spring, the bezier and
the durations; `Segmented` and `Label` are single components; the alpha scale
and the page shell are in `tokens.css` and `ToolShell`. The one item that did
**not** land is #5 — see §9, issue 1.

|       | Change                                                                                                                                                                                                                                                                                                                      | Effort | Risk |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---- |
| **1** | **Create `src/shared/`** and move in `cn`, `clipboard`, `CopyText`, `CopyButton`, `RowToggle`, `IconButton`, `ThemeToggle`, `ResetButton`, `ShareButton`, `ExportModal`. Lift the four in-`App.tsx` components out first. This is the pilot for the sync mechanism — if it hurts here, it will be unbearable at five tools. | M      | 🟢   |
| **2** | **Add motion tokens.** `shared/motion.ts`: `SPRING_PILL`, `EASE_PANEL = [0.22,1,0.36,1]`, `DUR = { instant: .14, fast: .16, base: .2, panel: .24 }`. Replace six copies of the spring. Cheap, and it means Motion Studio ships eating its own dog food.                                                                     | S      | 🟢   |
| **3** | **Extract one `<Segmented>`** with a `variant` prop covering the four skins, then delete three of the variants. Pick `rounded-md` + solid ink pill as the canonical one.                                                                                                                                                    | S      | 🟡   |
| **4** | **Unify the label components.** One `<Label>` at 11px mono uppercase `tracking-[0.16em]`, one bottom margin, one baseline. Fixes the visible misalignment.                                                                                                                                                                  | S      | 🟡   |
| **5** | **Fix the dark-mode contrast badges.** Give them `ink`-alpha backgrounds with the semantic hue on the text only, or add a `--color-ok` / `--color-warn` pair to the theme.                                                                                                                                                  | S      | 🟡   |
| **6** | **Name the alpha scale.** Add `--surface-1/2/3` (0.03 / 0.06 / 0.10 on ink) and `--edge-1/2/3` (0.20 / 0.30 / 0.40) and use them. Nine ad-hoc alphas become six named ones.                                                                                                                                                 | S      | 🟢   |
| **7** | **Extract the page shell** as `<ToolShell eyebrow title subtitle actions>`. Every tool's header, control band, rule and footer are the same object.                                                                                                                                                                         | M      | 🟡   |

### Tier 2 — do while building the second tool, informed by it

|        | Change                                                                                                                                                                                                                                                                     | Effort | Risk |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---- |
| **8**  | **Generalize `ExportPanel`** to `formats: { id, label, filename, mime, render(), subBar? }[]` plus the choice-card chooser. Keeps the _code vs prompt_ fork as the family pattern.                                                                                         | M      | 🟡   |
| **9**  | **Extract the URL-state kit** — `shared/url-state.ts` holding the encode/decode/resolve shape, the field-by-field validation idiom, the `.`-separated name list, and the `history.replaceState` + title-sync effect as a hook. Ramps' own param definitions stay in ramps. | M      | 🔴   |
| **10** | **Extract the agent-payload envelope** — `{ $schema, generator, source, input, notes }` plus the JSON↔text dual rendering, with per-tool bodies.                                                                                                                           | M      | 🔴   |
| **11** | **Extract a DTCG writer** taking typed leaves, so ramps emits colors and Motion emits durations/cubic-beziers through the same code.                                                                                                                                       | M      | 🟡   |
| **12** | **Extract `api/render.ts` + `middleware.ts` + `api/palette.ts`** as a parameterized pair. Only worth it if the family keeps the server-render trick (§8.G).                                                                                                                | M      | 🔴   |
| **13** | **Set `base: "./"` in `vite.config.ts`.** Makes the built bundle work from `file://`. Verify the OG image URL and canonical tag are unaffected (they're absolute, so they should be).                                                                                      | S      | 🟡   |

### Tier 3 — housekeeping, any time

|        | Change                                                                                                                                                            | Effort | Risk |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---- |
| **14** | **Add tests for `resolveTokens`.** It's the subtlest code in the project and completely uncovered. Vitest, ~10 cases. _(A new dependency — needs your sign-off.)_ | M      | 🟢   |
| **15** | **Settle the name.** `package.json` → `ramps-studio`, README H1 → "Color Ramp Generator", rename the GitHub repo (GitHub redirects the old URL).                  | S      | 🟡   |
| **16** | **Either ship or delete PDF export.** It's finished code behind a commented-out card.                                                                             | S      | 🟡   |
| **17** | Delete the dead `allRamps` import, the unused `@` alias, and either install ESLint or drop the two `eslint-disable` comments.                                     | S      | 🟢   |
| **18** | Gate CSS transitions behind `prefers-reduced-motion` with one global `@media` block.                                                                              | S      | 🟡   |
| **19** | `rounded-[4px]` → `rounded`; one `useCopy` reset duration.                                                                                                        | S      | 🟢   |
| **20** | Fix the mobile control row: stack the two accent fields, and give the action stack a right-alignment anchor.                                                      | S      | 🟡   |

**Nothing above is required for ramps to keep working.** The 🔴 items are the
only ones that can break the deployed site, and they break it in the one way
that a browser can't detect — `CLAUDE.md` is right that they must be verified
with a real no-JavaScript `curl`.

### G. The decision I'd force now: does the family keep the server render?

Ramps has four Vercel Functions. The new tools' brief says 100% client-side,
static, and runnable from the filesystem. Those are in direct tension, and
picking one per tool will fracture the family.

My recommendation: **keep it, and make it part of the family layer.** The
agent-readable no-JS render is the most distinctive thing about ramps.studio,
it's the reason the tools are "agent-ready", and dropping it for the sake of a
constraint would trade the differentiator for tidiness. It costs nothing to run
(pure functions, cached forever, zero-config on Vercel) and violates none of the
_spirit_ of "nothing to operate after launch".

But then the constraint should be restated honestly as: _no database, no auth,
no keys, no analytics beyond Vercel's, nothing to operate_ — **and** _the client
bundle alone is a complete working tool_, with the functions as a strictly
additive agent affordance. Setting `base: "./"` (#13) makes that literally true
and satisfies "runs from the filesystem" for the human-facing product.

---

## 12. How sharing should work

**Recommendation: a hand-synced `src/shared/` directory, copied between repos,
with a checksum script to tell you when they drift.** No workspace, no package,
no publish step.

### Why not the alternatives

**A published npm package (`@ryanreid/studio-kit`).** Every change to a shared
button becomes: edit → version → publish → bump in two repos → reinstall →
redeploy. For a family of free, zero-maintenance tools maintained by one person,
that's a release process bolted onto a design tweak. It also inverts the
dependency: you'd stop making quick visual changes because the ceremony costs
more than the change. Ruled out.

**A pnpm/Turborepo monorepo.** Genuinely better _engineering_ — one install, one
typecheck, atomic cross-tool changes, no drift possible. And genuinely worse for
this: you'd be merging five separately-deployed static sites, each with its own
domain and Vercel project, into one repo whose deploy config has to route builds
per app. Vercel supports it, but it's a build-config surface that exists purely
to serve the sharing mechanism. It also destroys the "fork this, it's MIT"
property — right now `README.md` says "fork it, change it, ship it" and that
works because a tool is a whole repo. Ruled out at this scale; **revisit at four
or five tools if drift becomes real.**

**Git submodules.** Solves drift, and I'd normally reach for it. But it makes
every clone two-step, every change a two-commit dance, and CI/Vercel needs
recursive checkout configured. The failure modes (detached HEAD, forgotten
pointer bump, a repo that builds locally and not on Vercel) all cost more
debugging time than the copy costs. Ruled out.

**Git subtree.** The best of the "real" options — normal clones, real history,
`git subtree pull` to sync. But subtree's ergonomics are famously bad to
remember, and you'd use it maybe once a month. Runner-up, not the pick.

### The proposal

```
src/
  shared/          ← identical byte-for-byte in every repo
    README.md      ← "Do not edit downstream. Sync from ramps-studio."
    MANIFEST.md    ← the tools manifest lives here (Phase 2)
    tokens.css     ← @theme block + .dark overrides
    motion.ts      ← springs, easings, durations
    utils.ts       ← cn()
    clipboard.ts   ← copyToClipboard + useCopy
    url-state.ts   ← encode/decode/resolve helpers + the sync hook
    components/
      ToolShell.tsx
      ToolSwitcher.tsx
      Label.tsx
      Segmented.tsx
      IconButton.tsx
      ThemeToggle.tsx
      ResetButton.tsx
      ShareButton.tsx
      RowToggle.tsx
      CopyText.tsx
      CopyButton.tsx
      ExportModal.tsx
      ExportPanel.tsx
      Attribution.tsx
  lib/             ← tool-specific logic
  components/      ← tool-specific UI
```

Three rules make it survivable:

1. **Ramps is upstream.** `src/shared/` is authored in ramps-studio and copied
   outward. Never edited downstream. The README in the directory says so, so
   future-you finds it.
2. **A sync script in each repo.** `scripts/sync-shared.sh` — one `rsync
--delete` from a sibling path, plus a `--check` mode that diffs and exits
   non-zero. Ten lines of bash, zero dependencies. Run `--check` before any
   release; run the copy when ramps' shared layer changes.
3. **`src/shared/` never imports from `src/lib/` or `src/components/`.** One
   direction only. If a shared component needs tool-specific behaviour, it takes
   it as a prop. This is the rule that keeps the copy mechanical.

The honest cost: two tools × a shared change = one `rsync` and two commits. At
five tools it's one `rsync` per repo — call it 30 seconds and five commits. The
`--check` mode is what stops silent drift, and it's the piece that makes this
better than "just copy the files", which is what actually happens when there's
no script.

**Argue me out of it?** Only on one axis: if you expect to be changing shared
components _weekly_ rather than _occasionally_, the copy tax compounds and a
monorepo wins. Everything I read in `NEXT-UP.md` suggests bursts of work
separated by long quiet periods, which is exactly the profile the copy suits.

---

## 13. Constants worth pinning down

For direct reuse. Everything here is what ramps.studio does today.

```css
/* Theme */
--font-display: "Geist Variable", system-ui, sans-serif;
--font-sans: "Inter Variable", system-ui, sans-serif;
--font-mono: "JetBrains Mono Variable", ui-monospace, monospace;

--color-paper: #fdfdfc;
--color-ink: #16150f;
--color-ash: #6b6a63;
--color-line: #e6e5df;
--color-line-soft: #f0efe9;
/* .dark */
--color-paper: #131210;
--color-ink: #f3f2ec;
--color-ash: #9a998f;
--color-line: #2d2b25;
--color-line-soft: #211f1a;
```

```ts
// Motion
export const SPRING_PILL = { type: "spring", stiffness: 480, damping: 38 } as const
export const EASE_PANEL = [0.22, 1, 0.36, 1] as const
export const DUR = { swap: 0.14, stage: 0.16, backdrop: 0.2, panel: 0.24 } as const
export const HOVER_LIFT = "transition-all hover:-translate-y-0.5"
```

```
Shell      mx-auto max-w-[1400px] px-6 py-10 lg:px-10 lg:py-14
Section    mb-12   ·  heading→body mb-4  ·  label→control mb-1.5..3
Rule       border-b border-line pb-10 mb-12   (below the control band)
Footer     mt-12 border-t border-line pt-6
Modal      max-w-3xl rounded-xl border border-line bg-paper p-5 sm:p-6 shadow-xl
Backdrop   fixed inset-0 z-40 bg-black/50 backdrop-blur-sm
Control h  36px (h-9) form controls · 40px (h-10 w-10) icon buttons
Radii      4px pill · 6px control · 8px card · 12px modal · full tag
Label      font-mono text-[11px] uppercase tracking-[0.16em] text-ash
```

---

## 14. Related docs

- [`README.md`](README.md) — what ramps.studio is, for people
- [`CLAUDE.md`](CLAUDE.md) — how to work in this repo
- [`PROJECT_MAP.md`](PROJECT_MAP.md) — what every file does
- [`NEXT-UP.md`](NEXT-UP.md) — session handoff and the rolling log
- [`docs/DESIGN-NOTES.md`](docs/DESIGN-NOTES.md) — original build plans
- [`public/llms.txt`](public/llms.txt) — the URL contract, for agents
