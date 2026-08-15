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
  /**
   * A dropdown or popover opening from its own trigger.
   *
   * Shorter than a panel on purpose. A popover is small, anchored to the thing
   * you just clicked, and already where you are looking — the motion confirms
   * the click rather than introducing a new place, so it should be finished
   * about as fast as you can register that it happened. Longer than this and a
   * menu you open constantly starts to feel like it is being negotiated.
   */
  popover: 0.16,
  /** Swapping one stage of a flow for another. */
  stage: 0.16,
  /** A backdrop fading in. */
  backdrop: 0.2,
  /** A panel or modal arriving. */
  panel: 0.24,
} as const

/**
 * The popover's own entrance, as Motion props.
 *
 * Named rather than repeated because the family has several popovers — the tool
 * switcher, the derivation menu, the colour pickers, the format picker — and
 * they were going to be four slightly different fades otherwise. The 4px rise
 * and the 0.98 scale are deliberately small: a popover that grows much more
 * than this reads as arriving from somewhere else, when it should read as
 * unfolding from its trigger.
 *
 * `originClass` is the Tailwind transform-origin to pair with it — popovers
 * that open downward should scale from their top edge, so the anchored corner
 * stays put.
 */
export const POPOVER = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
  transition: { duration: DUR.popover, ease: EASE_PANEL },
} as const

/** Pair with POPOVER on a menu that opens downward from its trigger. */
export const POPOVER_ORIGIN = "origin-top"

/**
 * The family's entire hover vocabulary for anything that reads as raised: a 2px
 * lift, no scale, no shadow. Applied to icon buttons, choice cards and the
 * attribution chips.
 */
export const HOVER_LIFT = "transition-all hover:-translate-y-0.5"
