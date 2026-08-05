// ==============================================
// SCHEME SELECT
// The "Derivation" dropdown — how accent colors are
// rotated off the brand hue (complementary,
// analogous, triadic, split, monochromatic).
// ==============================================
import { useEffect, useRef, useState } from "react"
import { SCHEMES, type Scheme } from "../lib/recommend"
import { cn } from "../shared/utils"
import { CaretDown, Check } from "@phosphor-icons/react"

type Props = {
  scheme: Scheme
  onChange: (scheme: Scheme) => void
}

/** Dropdown for choosing how downstream colors are derived from the brand. */
export default function SchemeSelect({ scheme, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = SCHEMES.find((s) => s.id === scheme) ?? SCHEMES[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="border-line bg-paper hover:border-ink/30 flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-sm transition-colors"
      >
        <span className="text-ink font-medium">{current.label}</span>
        <CaretDown
          size={12}
          weight="bold"
          aria-hidden="true"
          className={cn("text-ash shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-line bg-paper absolute top-full right-0 left-0 z-20 mt-1.5 overflow-hidden rounded-md border shadow-lg">
          {SCHEMES.map((s) => {
            const selected = s.id === scheme
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onChange(s.id)
                  setOpen(false)
                }}
                className={cn(
                  "block w-full px-3 py-2 text-left transition-colors",
                  selected ? "bg-ink/[0.05]" : "hover:bg-ink/[0.03]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-ink text-sm", selected && "font-medium")}>
                    {s.label}
                  </span>
                  {selected && (
                    <Check size={12} weight="bold" aria-hidden="true" className="text-ink" />
                  )}
                </div>
                <p className="text-ash mt-0.5 text-xs leading-snug">{s.blurb}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
