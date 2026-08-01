# Next Up

> **What this file is for:** Session handoff state — what was most recently
> built, what to do next, and known blockers. Read at the start of a session,
> update at the end. Previous sessions stay as a rolling log. Not a spec — see
> [`CLAUDE.md`](CLAUDE.md) for conventions and [`PROJECT_MAP.md`](PROJECT_MAP.md)
> for the file inventory.

## Current state

The app is fully decoupled from Figma Make and ready to self-host on Vercel.
It builds clean, typechecks clean, and runs with no console errors.

Source lives at **https://github.com/imryanreid/ramp-generator** (public, MIT),
`main` tracking `origin/main`.

**Not done yet — the remaining steps are all outside the codebase:**

1. ~~Create the public GitHub repo and push.~~ **Done 2026-08-01.**
2. **Create the Vercel project** and connect it to the repo above. Framework
   preset: Vite. Build command `pnpm build`, output directory `dist` — both
   should be auto-detected. No environment variables are required.
3. **Move `ramps.studio` off Figma Make.** The domain currently points at the
   Figma Make deployment. Add it to the Vercel project, then update the DNS
   records at the registrar. Expect a short window where the old deployment is
   still cached.
4. **Turn on Vercel Analytics + Speed Insights** in the project dashboard. The
   client code is already wired in `src/main.tsx`; both no-op until enabled.
5. **After DNS resolves**, submit `https://ramps.studio/sitemap.xml` to Google
   Search Console. The site was `noindex` for its whole life under Figma Make,
   so it has never been crawled.

## Known gaps / deliberate omissions

- **No `og:image`.** Links unfurl as a text-only card. Considered and skipped
  for now; generating one from the app's own palette output would be a nice
  touch later.
- **No `llms.txt`.** Considered and skipped — the JSON-LD block and the on-page
  machine-readable palette already cover the agent-consumption goal.
- **Fonts total ~118 KB** for the Latin subsets of three families (Geist, Inter,
  JetBrains Mono). Self-hosted, so no third-party round trip, but if load time
  ever matters more than the type choices, dropping to two families is the lever.
- **oxfmt** is still the formatter, inherited from the Figma scaffold. It works;
  it's just an unusual choice. Swapping to Prettier was considered and declined.

---

## Session log

### 2026-08-01 — Migration off Figma Make

Took the exported Figma Make project and made it self-hostable.

- **Stripped Figma**: deleted `.figma/`, cut `vite.config.ts` from 400 lines to
  24 by removing four Figma-only plugins, replaced the templated `index.html`
  with a real one, deleted the LFS `.gitattributes`, renamed the package from
  `figma-make-app`.
- **Fixed indexability**: the Figma `site.json` had `robots.index: false`, which
  was emitting `noindex, nofollow` and a `Disallow: /` robots.txt. Now indexable,
  with a canonical URL, Open Graph tags, a JSON-LD `WebApplication` block that
  documents the URL API, a permissive `robots.txt`, and a sitemap.
- **Assets**: 5.2 MB → 3 KB. Deleted five unreferenced PNGs; resized the two
  footer avatars from 3.87 MB and 1.33 MB (both rendered at 24 px) to 96 px WebP.
  Both now inline as data URIs at build time.
- **Fonts**: moved Geist, Inter, and JetBrains Mono off the Google Fonts CDN to
  self-hosted Fontsource variable fonts. Note the family names gained a
  " Variable" suffix in the `@theme` block.
- **Share links**: `SHARE_BASE` was hardcoded mid-file in `share.ts`; it's now
  `SITE_URL` in `src/lib/site.ts`, overridable with `VITE_SITE_URL`.
- **Clean landing page**: the URL sync and dynamic `<title>` now only engage once
  state diverges from `DEFAULT_STATE`, so a fresh visit stays at `/` with the
  canonical title — that's what crawlers index.
- **Added**: `cn()` utility, Vercel Analytics + Speed Insights, MIT license, and
  this doc set.
- **Published** to https://github.com/imryanreid/ramp-generator. The repo had
  been created with GitHub's auto-generated `LICENSE` commit; that was replaced
  by a force push so history starts at the migration commit. The only difference
  was the copyright line — kept as "Ryan Reid" to match the app footer, README,
  and JSON-LD author field.
