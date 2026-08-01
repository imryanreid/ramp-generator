// ==============================================
// URL PARAMS
// The query-string contract: encode the inputs that
// reproduce a palette, and decode them defensively.
//
// These param names are a public API — documented in
// README.md, in llms.txt, in the JSON-LD block in
// index.html, and in the on-page legend in App.tsx.
// Changing one breaks every link already shared.
//
// This module is deliberately free of browser and
// Vite dependencies (no `window`, no
// `import.meta.env`) because the Vercel Functions in
// /api import it too. Anything needing the canonical
// origin lives in share.ts instead.
// ==============================================
import { SCHEMES, type DsMode, type Scheme } from "./recommend.js"
import { COLOR_FORMATS, type ColorFormat } from "./color.js"
import type { Compliance } from "./semantics.js"

/** The full, deterministic input state that reproduces a palette. */
export type ShareState = {
  brand: string
  accentOverride: string | null
  mode: DsMode
  scheme: Scheme
  compliance: Compliance
  /** Notation for displayed and exported colors. */
  format: ColorFormat
  /** Ramp names deselected for export, e.g. "accent-2". Empty is the default. */
  excludedRamps: string[]
  /** Semantic token names deselected for export, e.g. "bg-info". */
  excludedTokens: string[]
}

/** The palette a caller gets with no params at all. */
export const DEFAULT_STATE: ShareState = {
  brand: "#3d7dff",
  accentOverride: null,
  mode: "full",
  scheme: "complementary",
  compliance: "AA",
  format: "oklch",
  excludedRamps: [],
  excludedTokens: [],
}

// Exclusions travel as dot-separated *names* rather than a bitmask over the
// token table's declaration order. A bitmask would be far shorter, but it would
// make that order a permanent public contract — inserting a token in the middle
// would silently repoint every link anyone had shared. Names only break on a
// rename, which is already a breaking change, and they stay readable to the
// agents this URL API exists for.
//
// The separator is "." rather than the more conventional ",": URLSearchParams
// serializes as form-urlencoded, which percent-encodes a comma (`%2C`) but
// leaves "." untouched. Dots keep the shared link legible.
const NAME_LIST = /^[a-z0-9.-]+$/i

function encodeNames(names: string[]): string {
  return names
    .filter((n) => n && !n.includes("."))
    .sort()
    .join(".")
}

function decodeNames(raw: string | null): string[] | undefined {
  if (!raw || !NAME_LIST.test(raw)) return undefined
  const names = raw.split(".").filter(Boolean)
  return names.length ? names : undefined
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
  if (s.format !== DEFAULT_STATE.format) p.set("f", s.format)
  if (s.excludedRamps.length) p.set("xr", encodeNames(s.excludedRamps))
  if (s.excludedTokens.length) p.set("xt", encodeNames(s.excludedTokens))
  return p.toString()
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

  const f = p.get("f")
  if (f && COLOR_FORMATS.some((x) => x.id === f)) out.format = f as ColorFormat

  const xr = decodeNames(p.get("xr"))
  if (xr) out.excludedRamps = xr

  const xt = decodeNames(p.get("xt"))
  if (xt) out.excludedTokens = xt

  return out
}

/** A complete state, filling anything the query string didn't supply. */
export function resolveShareState(search: string): ShareState {
  return { ...DEFAULT_STATE, ...decodeShareState(search) }
}
