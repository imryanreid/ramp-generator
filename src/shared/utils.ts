// ==============================================
// CLASS NAME UTILITY
// `cn()` merges Tailwind class names: clsx handles
// conditionals and falsy values, tailwind-merge
// resolves conflicts so a later class wins over an
// earlier one in the same utility group (e.g. a
// `text-ink` passed in overrides a default
// `text-ash`) instead of both landing in the DOM.
// ==============================================
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
