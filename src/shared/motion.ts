// ==============================================
// MOTION TOKENS
// Every duration, easing and spring the family uses.
//
// These were literals at their call sites — the same
// spring object copy-pasted six times, and five
// different inline durations. Naming them is what
// makes "the tools feel like siblings" enforceable
// rather than a matter of remembering the numbers.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================

/**
 * The segmented-control pill. Fast and slightly firm — it should arrive before
 * you finish reading the label you just clicked, without overshooting into a
 * wobble at these tiny travel distances.
 */
export const SPRING_PILL = { type: "spring", stiffness: 480, damping: 38 } as const

/** Panel entrances: a strong ease-out, so the motion is over before it's noticed. */
export const EASE_PANEL = [0.22, 1, 0.36, 1] as const

/**
 * Durations, in seconds — the unit Motion takes. Named for what they're for
 * rather than how long they are, so a value can be tuned in one place.
 */
export const DUR = {
  /** Content crossfade inside an already-open surface. */
  swap: 0.14,
  /** Swapping one stage of a flow for another. */
  stage: 0.16,
  /** A backdrop fading in. */
  backdrop: 0.2,
  /** A panel or modal arriving. */
  panel: 0.24,
} as const

/**
 * The family's entire hover vocabulary for anything that reads as raised: a 2px
 * lift, no scale, no shadow. Applied to icon buttons, choice cards and the
 * attribution chips.
 */
export const HOVER_LIFT = "transition-all hover:-translate-y-0.5"
