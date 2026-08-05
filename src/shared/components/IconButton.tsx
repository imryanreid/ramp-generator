// ==============================================
// ICON BUTTON
// The 40px square button used in every tool's
// utility row. Three variants: outline (default),
// solid (the primary action — one per page), and
// danger (destructive-ish, reddens on hover only).
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import type { ReactNode } from "react"
import { cn } from "../utils"
import { HOVER_LIFT } from "../motion"

export type IconButtonVariant = "outline" | "solid" | "danger"

const CHROME: Record<IconButtonVariant, string> = {
  solid: "bg-ink text-paper shadow-sm",
  outline: "border border-ink/20 text-ink hover:border-ink/40 hover:bg-ink/[0.04]",
  // Reserved for actions that throw away what the visitor built. The red only
  // appears on hover — at rest it must not read as a warning sitting on the page.
  danger:
    "border border-ink/20 text-ink hover:border-red-500 hover:text-red-500 hover:bg-red-500/[0.06]",
}

export default function IconButton({
  onClick,
  title,
  variant = "outline",
  children,
}: {
  onClick: () => void
  /** Doubles as the accessible name — icon-only buttons have no visible label. */
  title: string
  variant?: IconButtonVariant
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-md",
        HOVER_LIFT,
        CHROME[variant],
      )}
    >
      {children}
    </button>
  )
}
