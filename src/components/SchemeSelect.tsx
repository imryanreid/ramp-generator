// ==============================================
// SCHEME SELECT
// The "Derivation" dropdown — how accent colors are
// rotated off the brand hue (complementary,
// analogous, triadic, split, monochromatic).
// ==============================================
import { useEffect, useRef, useState } from "react"
import { SCHEMES, type Scheme } from "../lib/recommend"
import { cn } from "../lib/utils"

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
        className="flex w-full items-center justify-between gap-2 rounded-md border border-line bg-paper px-3 py-2 text-left text-sm transition-colors hover:border-ink/30"
      >
        <span className="font-medium text-ink">{current.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          className={cn("shrink-0 text-ash transition-transform", open && "rotate-180")}
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-md border border-line bg-paper shadow-lg">
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
                  <span className={cn("text-sm text-ink", selected && "font-medium")}>
                    {s.label}
                  </span>
                  {selected && (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M3 8.5l3.2 3.2L13 5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-snug text-ash">{s.blurb}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
