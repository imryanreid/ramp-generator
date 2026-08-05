// ==============================================
// COPY BUTTON
// Small icon button that copies a value and
// crossfades from a copy icon to a checkmark.
// ==============================================
import { useCopy } from "../clipboard"
import { cn } from "../utils"
import { Copy, Check } from "@phosphor-icons/react"

type Props = {
  value: string
  title?: string
  /** Extra classes on the button (e.g. hover-reveal via a parent `group`). */
  className?: string
}

/** Small icon button that copies `value` and crossfades to a check on success. */
export default function CopyButton({ value, title, className = "" }: Props) {
  const { copied, copy } = useCopy()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        copy(value)
      }}
      title={title ?? `Copy ${value}`}
      aria-label={title ?? `Copy ${value}`}
      className={cn(
        "text-ash hover:bg-ink/[0.06] hover:text-ink relative inline-flex h-5 w-5 items-center justify-center rounded transition-colors",
        className,
      )}
    >
      <Copy
        size={13}
        weight="regular"
        aria-hidden="true"
        className="absolute transition-all duration-200 ease-out"
        style={{ opacity: copied ? 0 : 1, transform: copied ? "scale(0.7)" : "none" }}
      />
      <Check
        size={13}
        weight="bold"
        aria-hidden="true"
        className="absolute text-emerald-600 transition-all duration-200 ease-out"
        style={{ opacity: copied ? 1 : 0, transform: copied ? "none" : "scale(0.7)" }}
      />
    </button>
  )
}
