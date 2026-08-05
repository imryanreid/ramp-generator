/// <reference types="vite/client" />

// ==============================================
// SHARED AMBIENT TYPES
// Pulls in Vite's client types, which is what
// declares the asset modules — `*.webp` and friends
// — that Attribution imports.
//
// This exists because src/shared must compile on its
// own. It first went without, relying on each repo's
// own src/vite-env.d.ts, and the second tool in the
// family failed to build the moment the directory
// was copied in: shared code depending on a
// declaration that lives outside shared is exactly
// the kind of coupling the copy can't carry.
//
// Tool-specific env vars stay in each repo's
// src/vite-env.d.ts. This file only covers what
// shared/ itself needs.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================

export {}
