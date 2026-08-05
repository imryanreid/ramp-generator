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
// Sized to stay quiet: one line per tool, no cards,
// no icons. It sits above the attribution and reads
// as a colophon rather than a nav bar.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import { TOOLS, toolUrl, FAMILY_NAME } from "../tools"
import { cn } from "../utils"

export default function ToolDirectory({ current }: { current: string }) {
  return (
    <nav
      id="tools"
      aria-label={`${FAMILY_NAME} — other tools`}
      className="border-line mt-12 border-t pt-6"
    >
      <h2 className="text-ash mb-4 font-mono text-[11px] tracking-[0.16em] uppercase">
        {FAMILY_NAME}
      </h2>
      <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const isCurrent = tool.id === current
          const href = toolUrl(tool)
          const soon = tool.status === "soon"

          const label = (
            <>
              <span className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "font-mono text-[11px] tracking-[0.14em] uppercase",
                    isCurrent ? "text-ink" : soon ? "text-ash" : "text-ink",
                  )}
                >
                  {tool.name}
                </span>
                {/* Mutually exclusive, matching the switcher menu. On the tool
                    you're already looking at, "soon" is noise at best and a
                    contradiction at worst — you are demonstrably on it. */}
                {isCurrent ? (
                  <span className="text-ash font-mono text-[10px] lowercase">you are here</span>
                ) : soon ? (
                  <span className="border-line text-ash rounded-full border px-1.5 py-px font-mono text-[10px] lowercase">
                    soon
                  </span>
                ) : null}
              </span>
              <span className="text-ash mt-0.5 block text-xs leading-snug">{tool.title}</span>
            </>
          )

          return (
            <li key={tool.id}>
              {href && !isCurrent ? (
                <a
                  href={href}
                  className="hover:text-ink block transition-colors hover:-translate-y-0.5"
                >
                  {label}
                </a>
              ) : (
                <span className={cn("block", soon && "opacity-70")}>{label}</span>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
