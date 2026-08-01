/// <reference types="vite/client" />

// Environment variables this app reads. Declaring them here means a typo in
// `import.meta.env.VITE_...` is a type error rather than a silent `undefined`.
interface ImportMetaEnv {
  /** Canonical site origin, e.g. "https://www.ramps.studio". Optional — see lib/site.ts. */
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
