// ==============================================
// BUILD LLMS.TXT FAMILY BLOCK
// Rewrites the "other tools in the family" section
// of public/llms.txt from the manifest, so it cannot
// drift out of date.
//
// It drifted badly before this existed: ramps.studio's
// llms.txt listed Motion as "not yet released" while
// springs.studio was live, and omitted Beeps entirely.
// Nothing failed, because a hand-maintained copy of
// generated data has nothing checking it.
//
// The block is delimited in llms.txt by:
//   <!-- FAMILY:START format="table" current="ramps" -->
//   <!-- FAMILY:END -->
// Everything between is replaced. HTML comments are
// valid markdown and render as nothing, so the file
// still reads cleanly to a human or an agent.
//
//   format="table"  a markdown table (marks the current tool)
//   format="list"   a padded plain-text block (omits it)
//   current="<id>"  which tool is rendering this file
//
// Usage:
//   node --experimental-strip-types src/shared/scripts/build-llms.mjs
//   node --experimental-strip-types src/shared/scripts/build-llms.mjs --check
//
// --check exits non-zero on drift without writing, for
// use in a verify gate. The plain form rewrites in place
// and runs as part of `pnpm build`, so a stale block is
// corrected before anyone commits it.
//
// The --experimental-strip-types flag is what lets this
// import the TypeScript manifest directly rather than
// parsing it. It is required on Node 22.6–23.5 and
// accepted as a no-op from 23.6 on, where stripping is
// the default. Importing the real module rather than
// regex-scraping it is the whole point: the manifest
// stays the single source of truth.
//
// SHARED FILE. Authored in ramps-studio and copied
// outward by scripts/sync-shared.sh, which is why it
// lives under src/shared/ rather than scripts/ — one
// authored copy, three repos, no drift. Don't edit it
// downstream.
// ==============================================
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

import { familyAsList, familyAsMarkdownTable } from "../tools.ts"

// src/shared/scripts/ -> src/shared/ -> src/ -> repo root
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..")
const TARGET = join(ROOT, "public", "llms.txt")

const START = /<!--\s*FAMILY:START([^>]*)-->/
const END = /<!--\s*FAMILY:END\s*-->/

const check = process.argv.includes("--check")

const src = readFileSync(TARGET, "utf8")
const open = src.match(START)
const close = src.match(END)

// Loud rather than silent: a repo that has not been given markers yet should
// fail the build with an instruction, not quietly ship an un-generated block.
if (!open || !close) {
  console.error(
    `build-llms: no FAMILY markers in ${TARGET}\n` +
      `Add these around the family section:\n` +
      `  <!-- FAMILY:START format="table" current="<tool-id>" -->\n` +
      `  <!-- FAMILY:END -->`,
  )
  process.exit(1)
}
if (close.index < open.index) {
  console.error(`build-llms: FAMILY:END appears before FAMILY:START in ${TARGET}`)
  process.exit(1)
}

const attr = (name) => open[1].match(new RegExp(`${name}="([^"]*)"`))?.[1]
const format = attr("format") ?? "table"
const current = attr("current")

if (format !== "table" && format !== "list") {
  console.error(`build-llms: unknown format="${format}" — expected "table" or "list"`)
  process.exit(1)
}

const block = format === "table" ? familyAsMarkdownTable(current) : familyAsList(current)

const head = src.slice(0, open.index + open[0].length)
const tail = src.slice(close.index)
const next = `${head}\n${block}\n${tail}`

if (next === src) {
  console.log(`build-llms: ${format} block already current`)
  process.exit(0)
}

if (check) {
  console.error(
    `build-llms: ${TARGET} is out of date with the manifest.\n` +
      `Run \`pnpm llms\` (or \`pnpm build\`) and commit the result.`,
  )
  process.exit(1)
}

writeFileSync(TARGET, next)
console.log(`build-llms: rewrote ${format} block in public/llms.txt`)
