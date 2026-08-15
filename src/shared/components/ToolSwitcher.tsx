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
import { AnimatePresence, motion } from "motion/react"
import { CaretDown } from "@phosphor-icons/react"
import { TOOLS, toolUrl } from "../tools"
import { cn } from "../utils"
import { POPOVER, POPOVER_ORIGIN } from "../motion"
import ToolMark from "./ToolMark"

/**
 * Where the donate row points. One place, because this file is copied into
 * every tool repo — a hardcoded URL per copy would be four to change.
 */
const DONATE_URL = "https://buymeacoffee.com/tktk"

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
    // No outer margin: this now sits in a utility row the host page lays out,
    // so spacing is the caller's business rather than baked in here.
    // min-w-0 so this yields before the row does. A flex item defaults to
    // min-width:auto and will not shrink below its content, which is what put
    // the utility row past the right edge of a phone — the wordmark refusing
    // to give up a pixel while four 40px buttons refused too.
    <div ref={ref} className="relative inline-block min-w-0 print:hidden">
      {/*
        A bordered control, not bare text with a caret. As an unstyled wordmark
        the affordance only landed if you were already looking for it — the
        caret alone reads as decoration at 11px. This borrows the chrome of the
        Derivation dropdown and the Format select so it is recognisable as the
        same kind of thing, just smaller.

        The box aligns its left edge to x=0 rather than its text, which indents
        the wordmark by the border plus padding. That matches every control
        below it — the Brand swatch and the Format select align by box too — and
        the alternative hangs the border outside the page gutter.
      */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Other tools in this family"
        className={cn(
          // min-w-0 and a truncating label so the wordmark yields before the
          // row does. It only ellipsizes on a very narrow screen; the row
          // staying intact matters more than the last few characters.
          // max-w-full is what actually contains this, and min-w-0 alone did
          // not. The wrapper is a block, so the button is an inline-level
          // child that nothing asks to shrink — it sized to its content and
          // spilled out of a wrapper that had correctly shrunk to 91px.
          // Capping it makes the label inside a flex item with somewhere to
          // shrink to, which is when truncate finally engages.
          "bg-paper inline-flex h-10 max-w-full min-w-0 items-center gap-2 rounded-md border pr-2 pl-2 font-mono text-[11px] tracking-[0.18em] uppercase transition-colors",
          open
            ? "border-ink/30 text-ink bg-ink/[0.03]"
            : "border-line text-ash hover:border-ink/30 hover:text-ink",
        )}
      >
        {/*
          The current tool's mark, same 16px as the menu rows below. Without it
          the collapsed control was the only place in the family where a tool
          was named but not shown, so opening the menu introduced a visual
          language that the trigger had not used — and the row you were already
          on was the one row whose mark you never saw.

          It costs 24px of a row that is already tight on a phone, which is why
          the left padding drops to match: the label truncates sooner, and the
          mark is the part worth keeping when space runs out.
        */}
        <ToolMark id={current} size={16} />
        {/* No wordmark until a domain exists — fall back to the tool's name. */}
        {/* min-w-0 as well as truncate: this span is itself a flex item, and a
            flex item defaults to min-width:auto — so without it the label
            keeps its full width and spills out of the chip rather than
            ellipsizing, and the next button draws on top of it. Visible when
            the reset button expands to offer an undo and the row loses 52px. */}
        <span className="min-w-0 truncate">{here?.wordmark ?? here?.name ?? current}</span>
        <CaretDown
          size={11}
          weight="bold"
          aria-hidden="true"
          className={cn(
            "text-ash shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {/*
        AnimatePresence so the menu has an EXIT as well as an entrance. Without
        it a popover can only fade in — closing stays instant, which reads worse
        than no animation at all because the two directions disagree.

        `origin-top` is what makes the scale read as unfolding from the trigger
        rather than growing from its own middle: the menu is anchored at its top
        edge, so that edge is the one that must not move.
      */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            {...POPOVER}
            className={cn(
              "border-line bg-paper absolute top-full left-0 z-30 mt-1.5 w-[320px] overflow-hidden rounded-md border shadow-xl",
              POPOVER_ORIGIN,
            )}
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
                    <span className="flex min-w-0 items-center gap-2">
                      <ToolMark id={tool.id} size={16} className={cn(soon && "opacity-50")} />
                      <span
                        className={cn(
                          "font-mono text-[11px] tracking-[0.14em] uppercase",
                          isCurrent ? "text-ink" : "text-ash",
                        )}
                      >
                        {/* Always the short name, current row included. The
                          address belongs on the collapsed trigger, which is
                          the site's wordmark; inside the menu every row is a
                          tool you might switch to, and one of them suddenly
                          being a hostname breaks the list it belongs to. */}
                        {tool.name}
                      </span>
                      {/* Beside the name, not floating at the far right — the
                        footer directory marks the current tool this way and a
                        dot at the opposite end of the row wouldn't read as the
                        same signal. */}
                      {isCurrent && (
                        <span
                          aria-hidden="true"
                          className="bg-ink h-1.5 w-1.5 shrink-0 rounded-full"
                        />
                      )}
                    </span>
                    {!isCurrent && soon ? (
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
                  <div key={tool.id} aria-current="page" className="bg-ink/[0.05] px-3 py-2.5">
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

            {/*
            Not a tool, so it carries no mark and sits below a rule — the list
            above is "somewhere else you can go in this family", and this is a
            different kind of thing. Same row metrics otherwise, so it reads as
            part of the menu rather than bolted on.

            Opens in a new tab: every tool in this family keeps its entire state
            in the query string, and someone part-way through editing a palette
            or a sound set should not have this replace it. `rel` is the usual
            pair — `noopener` is what stops the opened page reaching back
            through `window.opener`.
          */}
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="border-line hover:bg-ink/[0.03] block border-t px-3 py-2.5 transition-colors"
            >
              <span className="text-ash font-mono text-[11px] tracking-[0.14em] uppercase">
                Donate
              </span>
              <p className="text-ash mt-0.5 text-xs leading-snug">Help support our free apps</p>
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
