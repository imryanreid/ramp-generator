// ==============================================
// SHARE LINKS
// Browser-side helpers built on the URL contract in
// params.ts. Split out because this module knows the
// canonical origin (via Vite's import.meta.env) and
// reads window.location — neither of which exists in
// the Vercel Functions under /api, which import
// params.ts directly.
// ==============================================
import { encodeShareState, decodeShareState, type ShareState } from "./params"
import { SITE_URL } from "./site"

export {
  encodeShareState,
  decodeShareState,
  resolveShareState,
  DEFAULT_STATE,
  type ShareState,
} from "./params"

/** A shareable absolute URL for the given state, on the canonical domain. */
export function shareUrl(s: ShareState): string {
  return `${SITE_URL}/?${encodeShareState(s)}`
}

/** Read the initial shared state from the current URL, if any. */
export function readInitialShareState(): Partial<ShareState> {
  if (typeof window === "undefined") return {}
  return decodeShareState(window.location.search)
}
