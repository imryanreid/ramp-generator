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
   * The eyebrow wordmark above a tool's title, e.g. "ramps.studio".
   *
   * Separate from `domain` because the canonical host carries a `www.` that
   * looks wrong set in letterspaced caps. Optional, and absent until a domain
   * is actually registered — asserting a wordmark for a domain nobody owns puts
   * a name on screen that may never be true, which is the same mistake as
   * shipping a `domain` for an unreleased tool. Falls back to the tool's name.
   */
  wordmark?: string
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
    title: "Color scales & semantic tokens",
    blurb: "Perceptually-even OKLCH scales and accessible tokens from one brand color.",
    domain: "www.ramps.studio",
    status: "live",
  },
  {
    id: "motion",
    // The tool is Motion; springs.studio is where it lives. The family names
    // what a tool makes, and "springs" would name a mechanism that is only one
    // of the two easing types it produces.
    wordmark: "springs.studio",
    // "Springs" in the family surfaces — the switcher, the footer, the agent
    // listing — because that is the address people will type and remember.
    // The tool's own copy stays Motion: the H1, the page title, and the
    // `motion.*` token namespace it emits. One is the shelf label, the other
    // is what is written on the tin.
    name: "Springs",
    title: "Motion, easings & durations",
    blurb: "Easing curves, springs and durations you can preview on real UI.",
    domain: "www.springs.studio",
    status: "live",
  },
  {
    id: "sound",
    // The same split as motion/Springs: the id and the repo folder stay
    // "sound", and the shelf label is what the domain says.
    wordmark: "beeps.studio",
    name: "Beeps",
    title: "UI sounds & feedback",
    // Was "Short interface sounds that agree with the motion they accompany",
    // which promised a motion-coupling the tool does not do. It synthesizes;
    // that is the interesting part and the reason there is nothing to host.
    blurb: "A coherent set of interface sounds, synthesized rather than sampled.",
    domain: "www.beeps.studio",
    status: "live",
  },
  // The three unbuilt tools. Ids stay as they are — the same split motion and
  // sound already use, where the id and the repo folder are one word and the
  // shelf label is another. Renaming an id would mean renaming a folder and a
  // ToolMark key for a tool that does not exist yet.
  {
    id: "shape",
    name: "Depths",
    title: "Elevation & shadows",
    // Narrower than it was. This entry used to promise spacing steps and
    // nested radii too, which "Depths" does not cover — the name is a z-axis
    // word and the title now says only what it means.
    blurb: "Elevation levels and a shadow ramp derived from one light source.",
    status: "soon",
  },
  {
    id: "type",
    name: "Texts",
    title: "Type styles & scaling",
    blurb: "Scales that interpolate with the viewport, and the text styles built on them.",
    status: "soon",
  },
  {
    id: "icons",
    // Stored mixed-case and rendered uppercase by the switcher and the footer,
    // so this shows as "SVGS" on screen while staying readable as English in
    // llms.txt and the agent payload, which render it verbatim.
    name: "SVGs",
    title: "Icon cleanup & alignment",
    blurb: "Clean up exported SVGs and sit them on a consistent optical grid.",
    status: "soon",
  },
]

/** The family, described once, for page copy and agent payloads alike. */
export const FAMILY_NAME = "Studio Tools"

/**
 * What the footer directory calls the set.
 *
 * Separate from FAMILY_NAME on purpose. That one is the family's identity — it
 * goes in the agent payloads and in schema.org's `isPartOf`, where a nav label
 * would read as nonsense. This is a heading over a list of links, and it can
 * say something the identity shouldn't.
 */
export const FAMILY_DIRECTORY_LABEL = "all tktk.studio tools"
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

/**
 * The same list as a compact plain-text block — name, title, URL — with the
 * columns padded to fit whatever is actually in the manifest.
 *
 * Separate from `familyAsText` because that one emits a second line of prose
 * per tool, which is right for a payload an agent reads in full and wrong for
 * a directory an agent skims. `omitId` drops the tool doing the rendering, for
 * files whose heading already says "other tools".
 */
export function familyAsList(omitId?: string): string {
  const rows = TOOLS.filter((t) => t.id !== omitId)
  const nw = Math.max(...rows.map((t) => t.name.length)) + 2
  const tw = Math.max(...rows.map((t) => t.title.length)) + 2
  return rows
    .map((t) => {
      const where = t.domain ? `https://${t.domain}/` : "not yet released"
      return `  ${t.name.padEnd(nw)}${t.title.padEnd(tw)}${where}`
    })
    .join("\n")
}

/**
 * The same list as a markdown table, for `llms.txt` files written in markdown.
 * `currentId` marks the tool doing the rendering rather than dropping it —
 * a table with a header row reads as the complete set, so a silent omission
 * is more confusing than a "(this tool)" note.
 */
export function familyAsMarkdownTable(currentId?: string): string {
  const lines = ["| Tool | Makes | Where |", "| --- | --- | --- |"]
  for (const t of TOOLS) {
    const here = t.id === currentId ? " (this tool)" : ""
    const where = t.domain ? `https://${t.domain}/` : "not yet released"
    lines.push(`| ${t.name} | ${t.title} | ${where}${here} |`)
  }
  return lines.join("\n")
}
