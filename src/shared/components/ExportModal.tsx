// ==============================================
// EXPORT MODAL
// The dialog shell every tool's export flow renders
// into. Backdrop, panel, title bar, close button,
// Escape-to-close, and body scroll lock.
//
// Shell only — what goes inside is the tool's
// business, because the formats differ. The one thing
// the shell insists on is that the flow starts with a
// choice (code vs. agent prompt) rather than landing
// straight on tabs; see ExportPanel in each repo.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import { useEffect, type ReactNode } from "react"
import { motion } from "motion/react"
import { X } from "@phosphor-icons/react"
import { DUR, EASE_PANEL } from "../motion"

export default function ExportModal({
  children,
  onClose,
  title = "Export",
}: {
  children: ReactNode
  onClose: () => void
  title?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DUR.backdrop, ease: "easeOut" }}
    >
      <motion.div
        className="border-line bg-paper mt-6 w-full max-w-3xl rounded-xl border p-5 shadow-xl sm:mt-10 sm:p-6"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.985 }}
        transition={{ duration: DUR.panel, ease: EASE_PANEL }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ash hover:bg-ink/[0.06] hover:text-ink rounded p-1.5 transition-colors"
          >
            <X size={18} weight="regular" aria-hidden="true" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}
