// ==============================================
// SITE CONSTANTS
// The canonical public address of the app. Share
// links and any absolute URL are built from this
// rather than from window.location, so a link
// copied from a Vercel preview deploy still points
// at the real site.
// ==============================================

/**
 * Canonical origin, no trailing slash.
 *
 * Override per-environment with `VITE_SITE_URL` (set it in the Vercel project
 * settings if you ever want preview deploys to generate self-referencing
 * links). Falls back to production so a plain `pnpm build` is always correct.
 */
export const SITE_URL: string = (
  import.meta.env.VITE_SITE_URL ?? 'https://ramps.studio'
).replace(/\/+$/, '')
