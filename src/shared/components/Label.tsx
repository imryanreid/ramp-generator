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
