// ==============================================
// COPY TEXT
// Inline text that copies itself when clicked, with
// brief feedback — either a floating "copied" label
// or, with `swapOnCopy`, a checkmark in place of the
// content.
// ==============================================
import { type ReactNode } from "react"
import { useCopy } from "../lib/clipboard"
import { cn } from "../lib/utils"

type Props = {
  value: string
  /** Static content, or a render function receiving the transient copied flag. */
  children: ReactNode | ((copied: boolean) => ReactNode)
  className?: string
  title?: string
  /** When true, replaces the label with a checkmark on copy instead of a tooltip. */
  swapOnCopy?: boolean
}

/** Wraps content in a click-to-copy button with brief "Copied" feedback. */
export default function CopyText({ value, children, className = "", title, swapOnCopy = false }: Props) {
  const { copied, copy } = useCopy()
  const content = typeof children === "function" ? children(copied) : children

  return (
    <button
      type="button"
      onClick={() => copy(value)}
      title={title ?? `Copy ${value}`}
      className={cn("relative cursor-pointer transition-opacity hover:opacity-70", className)}
    >
      {swapOnCopy && copied ? (
        <span className="inline-flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 8.5l3.2 3.2L13 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          copied
        </span>
      ) : (
        content
      )}
      {!swapOnCopy && copied && typeof children !== "function" && (
        <span className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] text-paper">
          copied
        </span>
      )}
    </button>
  )
}
