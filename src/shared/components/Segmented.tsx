// ==============================================
// SEGMENTED CONTROL
// One component for what had become four skins of the
// same interaction: a bordered frame, a solid ink
// pill that springs between options, and inverted
// text on the active one.
//
// The pill is a shared `layoutId`, so each instance
// on a page needs its own — pass something stable and
// unique. Two instances sharing an id would make the
// pill fly across the page between them.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import { motion } from "motion/react"
import { cn } from "../utils"
import { SPRING_PILL } from "../motion"

export type SegmentedOption<T extends string> = {
  id: T
  label: string
  /** Tooltip. Worth setting where the label is an abbreviation. */
  title?: string
}

/**
 * `md` for page-level controls, `sm` where the control is secondary chrome.
 *
 * `md` is a 36px-tall frame so it lines up with the inputs and dropdowns beside
 * it. The control band used to run at three different heights — 40px buttons,
 * 36px inputs, 30px toggles — which read as a stagger rather than a row.
 */
export type SegmentedSize = "sm" | "md"

/**
 * `sm` is a fixed h-7, matching every other small control in the family.
 *
 * It used to size to its own content, which landed at 31px — three taller than
 * the h-7 buttons and chips beside it. That is invisible on its own and
 * obvious in a row: two panel headers side by side ended up three pixels
 * apart because one's tallest control was a button and the other's was this.
 */
const SIZES: Record<SegmentedSize, { frame: string; pad: string; text: string }> = {
  md: { frame: "h-9", pad: "px-3", text: "text-xs" },
  sm: { frame: "h-9 sm:h-7", pad: "px-2.5", text: "text-sm sm:text-[11px]" },
}

export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  size = "md",
  uppercase = false,
  ariaLabel,
}: {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (id: T) => void
  /** Unique per instance — this is the moving pill's identity. */
  layoutId: string
  size?: SegmentedSize
  uppercase?: boolean
  ariaLabel?: string
}) {
  const s = SIZES[size]
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      /*
        `bg-paper`, the same surface every input has. Transparent, an unselected
        option sitting on a tinted panel reads as disabled rather than as a
        choice you haven't made yet. On a paper background this changes nothing.
      */
      className={cn(
        "border-line bg-paper inline-flex items-center rounded-md border p-0.5",
        s.frame,
      )}
    >
      {options.map((o) => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            title={o.title}
            aria-pressed={active}
            className={cn(
              "relative inline-flex h-full items-center rounded font-mono transition-colors",
              s.pad,
              s.text,
              uppercase && "tracking-wide uppercase",
              active ? "text-paper" : "text-ash hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="bg-ink absolute inset-0 rounded"
                transition={SPRING_PILL}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
