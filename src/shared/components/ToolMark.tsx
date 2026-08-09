// ==============================================
// TOOL MARK
// Each tool's favicon, inline, at whatever size the
// caller asks for.
//
// Inline SVG rather than <img src="https://…/favicon.svg">
// on purpose. A remote icon is a cross-origin request
// per row for a 16px glyph, it fails offline and on a
// preview deploy, and the unreleased tools have no
// domain to load one from. These are a handful of
// shapes; shipping them as markup costs less than the
// requests would.
//
// Every mark shares the plate: a #131210 rounded
// square with the same rx and the same 6px inset, so
// the family reads as a set and only the figure
// inside changes.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import { cn } from "../utils"

const INK = "#131210"

/**
 * Figures, in the 32-unit viewBox the plate defines.
 *
 * A tool with no mark yet renders the bare plate rather than a placeholder
 * glyph — an invented symbol for an unbuilt tool is a promise about what it
 * will be, and these are quiet enough to read as "not yet".
 */
const FIGURES: Record<string, React.ReactNode> = {
  ramps: (
    <>
      <rect x="6" y="6" width="20" height="4" rx="1.2" fill="#c5d9ff" />
      <rect x="6" y="11" width="20" height="4" rx="1.2" fill="#8db0ff" />
      <rect x="6" y="16" width="20" height="4" rx="1.2" fill="#3d7dff" />
      <rect x="6" y="21" width="20" height="4" rx="1.2" fill="#2452b0" />
    </>
  ),
  // A spring's step response. Same path as springs.studio/favicon.svg — if you
  // change one, change both.
  motion: (
    <polyline
      points="7.70,23.30 8.25,22.53 8.81,20.53 9.36,17.82 9.91,14.90 10.47,12.19 11.02,10.01 11.57,8.53 12.13,7.80 12.68,7.76 13.23,8.27 13.79,9.16 14.34,10.23 14.89,11.29 15.45,12.23 16.00,12.93 16.55,13.35 17.11,13.51 17.66,13.42 18.21,13.16 18.77,12.79 19.32,12.39 19.87,12.01 20.43,11.69 20.98,11.48 21.53,11.37 22.09,11.35 22.64,11.41 23.19,11.53 23.75,11.68 24.30,11.83 24.30,11.83"
      fill="none"
      stroke="#8db0ff"
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
}

export default function ToolMark({
  id,
  size = 16,
  className,
}: {
  /** Tool id from the manifest. An unknown id renders the bare plate. */
  id: string
  size?: number
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="7" fill={INK} />
      {FIGURES[id] ?? null}
    </svg>
  )
}
