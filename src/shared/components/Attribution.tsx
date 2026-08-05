// ==============================================
// ATTRIBUTION
// The colophon. Identical in every tool, so the
// images live in src/shared/assets rather than each
// repo's own — both are under Vite's inline threshold
// and ship as data URIs, so there's no extra request.
//
// Forking this? This is one of the few places wired
// to a specific person. See "Forking this" in the
// README.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import avatarUrl from "../assets/avatar-ryan.webp"
import studioLogo from "../assets/logo-tktk.webp"
import { HOVER_LIFT } from "../motion"
import { cn } from "../utils"

const CHIP =
  "border-line hover:border-ink/30 hover:bg-ink/[0.04] inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1"

export default function Attribution() {
  return (
    <footer className="text-ash mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span>Built by</span>
      <a
        href="https://www.linkedin.com/in/imryanreid/"
        target="_blank"
        rel="noreferrer"
        className={cn(CHIP, HOVER_LIFT)}
      >
        <img src={avatarUrl} alt="Ryan Reid" className="h-6 w-6 rounded-full object-cover" />
        <span className="text-ink font-medium">Ryan Reid</span>
      </a>
      <span>at</span>
      <a
        href="https://www.tktk.studio/"
        target="_blank"
        rel="noreferrer"
        className={cn(CHIP, HOVER_LIFT)}
      >
        <img src={studioLogo} alt="tktk studio" className="h-6 w-6 rounded-full object-cover" />
        <span className="text-ink font-medium">tktk studio</span>
      </a>
    </footer>
  )
}
