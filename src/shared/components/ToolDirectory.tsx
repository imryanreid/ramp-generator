// ==============================================
// TOOL DIRECTORY
// The family, listed in the footer as plain anchors.
//
// This is the crawlable half of the switcher. The
// header menu doesn't exist until React runs, and
// most agents that follow a link never run it — so
// the dropdown alone would make the rest of the
// family invisible to exactly the audience these
// tools are built for. This block is always in the
// DOM, always real <a href>, and survives
// HTML-to-markdown conversion.
//
// Each tool sits in its own faintly-ruled box, and
// the one you're on is filled and tagged. The boxes
// are what make it scannable as a set — an unruled
// grid of five two-line entries reads as prose in
// columns, and the tool you're already on is the one
// piece of information the block can give you for
// free.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import { TOOLS, toolUrl, FAMILY_DIRECTORY_LABEL } from "../tools"
import { cn } from "../utils"
import ToolMark from "./ToolMark"

export default function ToolDirectory({ current }: { current: string }) {
  return (
    <nav
      id="tools"
      aria-label={FAMILY_DIRECTORY_LABEL}
      className="border-line mt-12 border-t pt-6"
    >
      <h2 className="text-ash mb-4 font-mono text-[11px] tracking-[0.16em] uppercase">
        {FAMILY_DIRECTORY_LABEL}
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const isCurrent = tool.id === current
          const href = toolUrl(tool)
          const soon = tool.status === "soon"

          const label = (
            <>
              <span className="flex items-center gap-2">
                <ToolMark id={tool.id} size={16} className={cn(soon && "opacity-50")} />
                <span
                  className={cn(
                    "font-mono text-[11px] tracking-[0.14em] uppercase",
                    // Only the current tool gets full ink. Five names at the
                    // same weight is a list; one darker than the rest is a
                    // list with your place in it.
                    isCurrent ? "text-ink" : "text-ash",
                  )}
                >
                  {tool.name}
                </span>
                {/* Mutually exclusive, matching the switcher menu. On the tool
                    you're already looking at, "soon" is noise at best and a
                    contradiction at worst — you are demonstrably on it. */}
                {/* A dot, not a word. The filled box already says "this one";
                    a tag beside it says it twice, and this block is a
                    colophon — it should read quietly. aria-current carries
                    the meaning that the dot can't. */}
                {isCurrent ? (
                  <span
                    aria-hidden="true"
                    className="bg-ink h-1.5 w-1.5 shrink-0 self-center rounded-full"
                  />
                ) : soon ? (
                  <span className="border-line text-ash rounded-full border px-1.5 py-px font-mono text-[11px] lowercase sm:text-[10px]">
                    soon
                  </span>
                ) : null}
              </span>
              <span className="text-ash mt-0.5 block text-sm leading-snug sm:text-xs">
                {tool.title}
              </span>
            </>
          )

          // One shape for all three states, so the boxes stay the same size
          // whether they hold a link, the current tool, or something unbuilt.
          // h-full because the <li> is the grid item and stretches, but the
          // box inside it sizes to its own content — without this the boxes
          // in a row end at three different heights, which is worse than
          // having no boxes at all.
          const box = "block h-full rounded-lg border p-3"

          return (
            <li key={tool.id}>
              {href && !isCurrent ? (
                <a
                  href={href}
                  className={cn(
                    box,
                    "border-line hover:border-ink/25 hover:bg-ink/[0.03] transition-colors",
                  )}
                >
                  {label}
                </a>
              ) : (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    box,
                    // Stronger than a hovered neighbour, so the current tool
                    // still reads as the current tool while you're pointing
                    // somewhere else.
                    isCurrent ? "border-ink/40 bg-ink/[0.04]" : "border-line",
                    // Never dim the tool you're on. The same reason the
                    // "soon" pill is suppressed here: you are demonstrably
                    // looking at it, and fading it fights the stronger stroke
                    // that says so.
                    soon && !isCurrent && "opacity-70",
                  )}
                >
                  {label}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
