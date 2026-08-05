// ==============================================
// COPY TEXT
// Inline text that copies itself when clicked, with
// brief feedback — either a floating "copied" label
// or, with `swapOnCopy`, a checkmark in place of the
// content.
// ==============================================
import { type ReactNode } from "react"
import { useCopy } from "../clipboard"
import { cn } from "../utils"
import { Check } from "@phosphor-icons/react"

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
export default function CopyText({
  value,
  children,
  className = "",
  title,
  swapOnCopy = false,
}: Props) {
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
          <Check size={12} weight="bold" aria-hidden="true" />
          copied
        </span>
      ) : (
        content
      )}
      {!swapOnCopy && copied && typeof children !== "function" && (
        <span className="bg-ink text-paper pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 rounded px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap">
          copied
        </span>
      )}
    </button>
  )
}
