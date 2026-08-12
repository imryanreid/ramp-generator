// ==============================================
// TOOL SHELL
// The page every tool in the family is built inside:
// container width, utility row, title block, the
// bordered control band, the output area, and the
// footer directory plus colophon.
//
// Three rows, in this order and for this reason:
//   1. Utility — the family switcher and the actions
//      that operate on the page. Full width, so the
//      two ends align with each other.
//   2. Title — what the page is.
//   3. Controls — what you change, above a rule.
// Everything below the rule is output.
//
// `reducedMotion="user"` is set here so no tool has
// to remember it. Note it governs Motion components
// only; CSS transitions need their own media query in
// tokens.css.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import type { ReactNode } from "react"
import { AnimatePresence, MotionConfig } from "motion/react"
import ToolSwitcher from "./ToolSwitcher"
import ToolDirectory from "./ToolDirectory"
import Attribution from "./Attribution"

export default function ToolShell({
  toolId,
  title,
  subtitle,
  actions,
  controls,
  overlay,
  children,
}: {
  /** Which entry in the tools manifest this repo is. */
  toolId: string
  title: string
  subtitle: ReactNode
  /** The right end of the utility row — icon buttons. */
  actions?: ReactNode
  /** The control band, above the rule. */
  controls?: ReactNode
  /** Modals and other overlays; wrapped in AnimatePresence so exits animate. */
  overlay?: ReactNode
  /** The output. */
  children: ReactNode
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen">
        <AnimatePresence>{overlay}</AnimatePresence>

        {/* px-4 below sm: the utility row is a wordmark and four 40px buttons,
            which together need more than a 375px screen leaves at px-6. Eight
            pixels of padding is a cheaper thing to give up than the row. */}
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
          <section className="border-line mb-12 border-b pb-10">
            {/*
              Utility row. Everything that acts on the page rather than
              describing it, on one line across the full width, so the switcher
              and the action stack read as a pair of controls rather than as
              decoration attached to the title. One row at every width — the
              earlier breakpoint that stacked them left the buttons floating
              above the header with nothing to anchor them.
            */}
            <div className="mb-8 flex items-center justify-between gap-4 print:hidden">
              <ToolSwitcher current={toolId} />
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>

            {/*
              What the page is. Its own row, below the controls that act on it.
              The bottom margin belongs to the gap above the control band, so a
              tool without controls doesn't pay for a band it hasn't got — that
              left a tool-shaped hole of empty page above the rule.
            */}
            <header className={controls ? "mb-8" : undefined}>
              <h1 className="font-display text-3xl leading-none font-semibold tracking-tight">
                {title}
              </h1>
              <p className="text-ash mt-3 max-w-[52ch] text-sm leading-relaxed">{subtitle}</p>
            </header>

            {controls}
          </section>

          <main className="min-w-0">
            {children}
            <ToolDirectory current={toolId} />
            <Attribution />
          </main>
        </div>
      </div>
    </MotionConfig>
  )
}
