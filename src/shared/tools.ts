// ==============================================
// TOOLS MANIFEST
// The whole family, in one list. This is the only
// file that needs editing to add a tool — write the
// entry here, then copy this file into every other
// repo (scripts/sync-shared.sh does that).
//
// SHARED FILE. Authored in ramps-studio, copied
// outward byte-for-byte. Don't edit it downstream.
//
// Deliberately free of imports and of any notion of
// "which tool am I" — the current tool is passed in
// as a prop at the one place it's rendered, so this
// file stays identical in every repo.
// ==============================================

/**
 * `live` — shipped, has a domain, links out.
 * `soon` — announced but not built. Renders as a non-link so a visitor (or an
 * agent) learns it exists without being sent to a 404.
 */
export type ToolStatus = "live" | "soon"

export type Tool = {
  /** Stable id. Also what a host repo passes as `current`. */
  id: string
  /** Short label, shown in menu rows and the footer list. */
  name: string
  /**
   * The eyebrow wordmark above a tool's title, e.g. "ramps.studio". Kept
   * separate from `domain` because the canonical host carries a `www.` that
   * looks wrong set in letterspaced caps — and because a tool that hasn't
   * shipped still has a wordmark but no host.
   */
  wordmark: string
  /** What it makes. One noun phrase, no verb. */
  title: string
  /** One line, plain language. Shown in the switcher and the footer. */
  blurb: string
  /**
   * Bare hostname, no protocol. Present only on `live` tools — a tool that
   * hasn't shipped has nowhere to point, and inventing a URL now means every
   * copy of this manifest carries a dead link until the domain is registered.
   */
  domain?: string
  status: ToolStatus
}

export const TOOLS: Tool[] = [
  {
    id: "ramps",
    wordmark: "ramps.studio",
    name: "Ramps",
    title: "Color ramps & semantic tokens",
    blurb: "Perceptually-even OKLCH ramps and accessible tokens from one brand color.",
    domain: "www.ramps.studio",
    status: "live",
  },
  {
    id: "motion",
    wordmark: "motion.studio",
    name: "Motion",
    title: "Motion tokens",
    blurb: "Easing curves, springs and durations you can preview on real UI.",
    status: "soon",
  },
  {
    id: "shape",
    wordmark: "shape.studio",
    name: "Shape",
    title: "Spacing, radius & elevation",
    blurb: "One set of rules for spacing steps, nested radii and a light-source shadow ramp.",
    status: "soon",
  },
  {
    id: "type",
    wordmark: "type.studio",
    name: "Type",
    title: "Type scale",
    blurb: "A modular scale with line heights that land on the baseline grid.",
    status: "soon",
  },
  {
    id: "fallback",
    wordmark: "fallback.studio",
    name: "Fallback",
    title: "Font fallback metrics",
    blurb: "size-adjust and ascent overrides that stop the swap from shifting layout.",
    status: "soon",
  },
  {
    id: "svg",
    wordmark: "svg.studio",
    name: "SVG",
    title: "SVG normalizer",
    blurb: "Flatten, clean and normalize exported SVGs into consistent icon markup.",
    status: "soon",
  },
]

/** The family, described once, for page copy and agent payloads alike. */
export const FAMILY_NAME = "Studio Tools"
export const FAMILY_BLURB =
  "Small, free, agent-readable design utilities. No account, no API key, nothing stored."

/** Absolute URL for a tool, or null when it hasn't shipped. */
export function toolUrl(tool: Tool): string | null {
  return tool.domain ? `https://${tool.domain}/` : null
}

/**
 * The family as plain text, for `llms.txt` and the agent-readable block. Every
 * tool ships this so an agent that finds one finds all of them — the switcher
 * is a discovery surface for machines as much as for people, and a dropdown
 * that only exists once JavaScript runs is invisible to most of them.
 */
export function familyAsText(currentId?: string): string {
  // Rows only. The caller supplies its own heading, so this doesn't repeat the
  // family name directly under one.
  const lines: string[] = []
  for (const t of TOOLS) {
    const here = t.id === currentId ? "  (this tool)" : ""
    const where = t.domain ? `https://${t.domain}/` : "not yet released"
    lines.push(`  ${t.name.padEnd(9)} ${t.title.padEnd(32)} ${where}${here}`)
    lines.push(`  ${" ".repeat(9)} ${t.blurb}`)
  }
  return lines.join("\n")
}
