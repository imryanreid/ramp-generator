// ==============================================
// COPY BUTTON
// Small icon button that copies a value and
// crossfades from a copy icon to a checkmark.
// ==============================================
import { useCopy } from "../lib/clipboard"
import { cn } from "../lib/utils"

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
        "relative inline-flex h-5 w-5 items-center justify-center rounded text-ash transition-colors hover:bg-ink/[0.06] hover:text-ink",
        className,
      )}
    >
      {/* Copy icon */}
      <svg
        width="13"
        height="13"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="absolute transition-all duration-200 ease-out"
        style={{ opacity: copied ? 0 : 1, transform: copied ? "scale(0.7)" : "none" }}
      >
        <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3.5 10.5H3a1 1 0 01-1-1V3a1 1 0 011-1h6.5a1 1 0 011 1v0.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      {/* Check icon */}
      <svg
        width="13"
        height="13"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="absolute text-emerald-600 transition-all duration-200 ease-out"
        style={{ opacity: copied ? 1 : 0, transform: copied ? "none" : "scale(0.7)" }}
      >
        <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
