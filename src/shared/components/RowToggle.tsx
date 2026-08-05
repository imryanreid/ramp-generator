// ==============================================
// ROW TOGGLE
// The small checkbox beside each ramp and semantic
// token. Unchecking never changes what gets
// calculated — it only drops that row from the
// export and the agent-readable block. A real
// <input type="checkbox"> underneath keeps it
// keyboard- and screen-reader-navigable.
// ==============================================
import { Check, Minus } from "@phosphor-icons/react"
import { cn } from "../utils"

export default function RowToggle({
  checked,
  indeterminate = false,
  onChange,
  label,
  className,
}: {
  checked: boolean
  /** Mixed state, for the group-level "everything in this section" toggle. */
  indeterminate?: boolean
  onChange: () => void
  label: string
  className?: string
}) {
  const filled = checked || indeterminate
  return (
    <label
      title={label}
      className={cn("group/toggle inline-flex shrink-0 cursor-pointer items-center", className)}
    >
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate
        }}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex h-[15px] w-[15px] items-center justify-center rounded-[4px] border transition-colors",
          "peer-focus-visible:ring-ink/30 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1",
          filled
            ? "border-ink bg-ink text-paper"
            : "border-line group-hover/toggle:border-ash bg-transparent",
        )}
      >
        {indeterminate ? (
          <Minus size={9} weight="bold" aria-hidden="true" />
        ) : checked ? (
          <Check size={10} weight="bold" aria-hidden="true" />
        ) : null}
      </span>
    </label>
  )
}
