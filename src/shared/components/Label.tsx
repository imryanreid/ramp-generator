// ==============================================
// LABELS
// One control label for the whole family, replacing
// three near-identical ones that had drifted to three
// tracking values and three bottom margins — which
// left the labels in the control row sitting on three
// different baselines.
//
// `Label` is the bare type treatment. `FieldLabel` is
// the row it usually sits in: fixed height, optional
// trailing element (a status pill, a hint), and the
// single margin that keeps every control aligned.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import type { ReactNode } from "react"
import { cn } from "../utils"

/**
 * The title of a panel — Geist, not mono.
 *
 * A panel header set in the same 11px uppercase mono as its control labels has
 * no hierarchy to perceive: "Timing" and "Exit" read as siblings when one
 * contains the other. The family already has two faces for this, so use them.
 *
 * Larger on a phone, and the reason is the same argument one breakpoint along.
 * Touch forces inputs to 16px — below that Safari zooms the viewport on focus —
 * so a 14px title ended up *smaller* than the fields it introduces. The
 * controls cannot come down, so the title goes up. At that width the panels are
 * stacked full-width and read as sections rather than cards, which is why this
 * lands on the same size as a section heading instead of somewhere between.
 */
export function PanelTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h2
      className={cn("font-display text-xl font-semibold tracking-tight sm:text-sm", className)}
    >
      {children}
    </h2>
  )
}

/** 11px mono, uppercase, letterspaced. The family's one label treatment. */
export function Label({
  children,
  className,
  as: Tag = "span",
}: {
  children: ReactNode
  className?: string
  /** `h2` where the label heads a real section; the default `span` otherwise. */
  as?: "span" | "h2" | "label"
}) {
  return (
    <Tag
      className={cn("text-ash font-mono text-[11px] tracking-[0.16em] uppercase", className)}
    >
      {children}
    </Tag>
  )
}

/**
 * A label in its row above a control.
 *
 * The fixed height is what does the work: some fields carry a trailing pill
 * (the Auto/Manual switch) and some don't, and without a shared height those
 * two kinds of field sat on different baselines in the same row.
 */
export function FieldLabel({
  children,
  aside,
  className,
}: {
  children: ReactNode
  /** Trailing element, right-aligned — a status pill or a hint. */
  aside?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-1.5 flex h-5 items-center justify-between gap-2", className)}>
      <Label>{children}</Label>
      {aside}
    </div>
  )
}
