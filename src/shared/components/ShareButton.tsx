// ==============================================
// SHARE BUTTON
// Copies a link to the current state and crossfades
// to a checkmark.
//
// Takes the finished URL rather than a state object:
// each tool encodes its own query string, and passing
// the string keeps this file free of any one tool's
// param contract.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import { LinkSimple, Check } from "@phosphor-icons/react"
import IconButton from "./IconButton"
import { useCopy } from "../clipboard"

export default function ShareButton({
  url,
  title = "Copy a shareable link to this configuration",
}: {
  url: string
  title?: string
}) {
  const { copied, copy } = useCopy(1400)
  return (
    <IconButton onClick={() => copy(url)} title={title}>
      <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
        <LinkSimple
          size={18}
          weight="regular"
          aria-hidden="true"
          className="absolute transition-all duration-200 ease-out"
          style={{ opacity: copied ? 0 : 1, transform: copied ? "scale(0.7)" : "none" }}
        />
        <Check
          size={18}
          weight="bold"
          aria-hidden="true"
          className="absolute text-emerald-500 transition-all duration-200 ease-out"
          style={{ opacity: copied ? 1 : 0, transform: copied ? "none" : "scale(0.7)" }}
        />
      </span>
    </IconButton>
  )
}
