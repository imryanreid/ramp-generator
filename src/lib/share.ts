// ==============================================
// SHARE LINKS
// The whole palette is derived from four inputs, so
// a shareable link needs no backend — the inputs fit
// in a query string. This encodes them, decodes them
// defensively on load, and builds the absolute URL.
//
// These param names are a public API — they are
// documented in README.md, in the JSON-LD block in
// index.html, and in the on-page legend in App.tsx.
// Changing one breaks every link already shared.
// ==============================================
import { SCHEMES, type DsMode, type Scheme } from "./recommend"
import type { Compliance } from "./semantics"
import { SITE_URL } from "./site"

/** The full, deterministic input state that reproduces a palette. */
export type ShareState = {
  brand: string
  accentOverride: string | null
  mode: DsMode
  scheme: Scheme
  compliance: Compliance
}

const HEX = /^[0-9a-fA-F]{6}$/

/** Serialize the inputs into a compact query string (no leading "?"). */
export function encodeShareState(s: ShareState): string {
  const p = new URLSearchParams()
  p.set("b", s.brand.replace("#", ""))
  if (s.accentOverride) p.set("a", s.accentOverride.replace("#", ""))
  p.set("m", s.mode)
  p.set("s", s.scheme)
  p.set("c", s.compliance)
  return p.toString()
}

/** A shareable absolute URL for the given state, on the canonical domain. */
export function shareUrl(s: ShareState): string {
  return `${SITE_URL}/?${encodeShareState(s)}`
}

/** Parse a query string into a partial state, dropping any invalid fields. */
export function decodeShareState(search: string): Partial<ShareState> {
  const p = new URLSearchParams(search)
  const out: Partial<ShareState> = {}

  const b = p.get("b")
  if (b && HEX.test(b)) out.brand = `#${b.toLowerCase()}`

  const a = p.get("a")
  if (a && HEX.test(a)) out.accentOverride = `#${a.toLowerCase()}`

  const m = p.get("m")
  if (m === "full" || m === "basic") out.mode = m

  const s = p.get("s")
  if (s && SCHEMES.some((x) => x.id === s)) out.scheme = s as Scheme

  const c = p.get("c")
  if (c === "AA" || c === "AAA") out.compliance = c

  return out
}

/** Read the initial shared state from the current URL, if any. */
export function readInitialShareState(): Partial<ShareState> {
  if (typeof window === "undefined") return {}
  return decodeShareState(window.location.search)
}
