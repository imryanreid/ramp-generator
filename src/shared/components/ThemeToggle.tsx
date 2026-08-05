// ==============================================
// THEME TOGGLE
// Sun/moon crossfade in an IconButton. Shows the
// theme you'd get by clicking, not the one you're in
// — a moon while light means "go dark".
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import { Sun, Moon } from "@phosphor-icons/react"
import IconButton from "./IconButton"
import type { Theme } from "../theme"

export default function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme
  onToggle: () => void
}) {
  const dark = theme === "dark"
  return (
    <IconButton
      onClick={onToggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
        {/* Sun (shown in dark mode → click for light) */}
        <Sun
          size={18}
          weight="regular"
          aria-hidden="true"
          className="absolute transition-all duration-300 ease-out"
          style={{
            opacity: dark ? 1 : 0,
            transform: dark ? "none" : "rotate(-90deg) scale(0.6)",
          }}
        />
        {/* Moon (shown in light mode → click for dark) */}
        <Moon
          size={18}
          weight="regular"
          aria-hidden="true"
          className="absolute transition-all duration-300 ease-out"
          style={{
            opacity: dark ? 0 : 1,
            transform: dark ? "rotate(90deg) scale(0.6)" : "none",
          }}
        />
      </span>
    </IconButton>
  )
}
