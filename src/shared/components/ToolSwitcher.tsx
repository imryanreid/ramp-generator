// ==============================================
// TOOL SWITCHER
// The family menu, hung off the eyebrow wordmark
// above each tool's title.
//
// It reuses the wordmark rather than adding a button
// to the action stack: these are small single-purpose
// apps, the top-right stack is where the primary
// action (Export) lives, and a sixth 40px button
// would compete with it. The eyebrow already reads as
// a brand mark and already occupies that space, so
// the switcher costs no new pixels.
//
// Discovery for humans. The crawlable, no-JavaScript
// copy is ToolDirectory in the footer — this menu
// does not exist until React runs, so it can't be the
// only place the family is listed.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import { useEffect, useRef, useState } from "react"
import { CaretDown, Check } from "@phosphor-icons/react"
import { TOOLS, toolUrl } from "../tools"
import { cn } from "../../lib/utils"

export default function ToolSwitcher({ current }: { current: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const here = TOOLS.find((t) => t.id === current)

  // Outside-click + Escape, mirroring SchemeSelect so every popover in the
  // family dismisses the same way.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative mb-1 inline-block print:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Other tools in this family"
        className="text-ash hover:text-ink -mx-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 font-mono text-[11px] tracking-[0.2em] uppercase transition-colors"
      >
        {here?.wordmark ?? current}
        <CaretDown
          size={9}
          weight="bold"
          aria-hidden="true"
          className={cn("shrink-0 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="border-line bg-paper absolute top-full left-0 z-30 mt-2 w-[320px] overflow-hidden rounded-lg border shadow-xl"
        >
          {TOOLS.map((tool) => {
            const isCurrent = tool.id === current
            const href = toolUrl(tool)
            const soon = tool.status === "soon"

            // The current tool is stated, never linked — a menu item that
            // reloads the page you're on reads as a dead control.
            const inner = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "font-mono text-[11px] tracking-[0.14em] uppercase",
                      soon ? "text-ash" : "text-ink",
                    )}
                  >
                    {tool.name}
                  </span>
                  {isCurrent ? (
                    <span className="text-ash inline-flex shrink-0 items-center gap-1 font-mono text-[10px] tracking-wide lowercase">
                      <Check size={10} weight="bold" aria-hidden="true" />
                      you are here
                    </span>
                  ) : soon ? (
                    <span className="border-line text-ash shrink-0 rounded-full border px-1.5 py-px font-mono text-[10px] tracking-wide lowercase">
                      soon
                    </span>
                  ) : null}
                </div>
                {/* `title`, not `blurb` — six two-line blurbs made a menu tall
                    enough to swallow the page header. The fuller prose is in
                    the footer directory and the agent payload. */}
                <p className="text-ash mt-0.5 text-xs leading-snug">{tool.title}</p>
              </>
            )

            if (isCurrent) {
              return (
                <div key={tool.id} className="bg-ink/[0.05] px-3 py-2.5">
                  {inner}
                </div>
              )
            }
            if (!href) {
              return (
                <div key={tool.id} className="px-3 py-2.5 opacity-60" aria-disabled="true">
                  {inner}
                </div>
              )
            }
            return (
              <a
                key={tool.id}
                href={href}
                role="menuitem"
                className="hover:bg-ink/[0.03] block px-3 py-2.5 transition-colors"
              >
                {inner}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
