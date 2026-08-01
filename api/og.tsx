// ==============================================
// GET /api/og
// The social share image, rendered per palette.
//
// Same query contract as everything else, so a
// shared link unfurls showing *its own* colors
// rather than a generic card. Built from the same
// buildPalette + readableText the site uses, so the
// swatches and label contrast match what the visitor
// actually sees.
//
// Typography note: the site sets body copy in Inter
// and mono in JetBrains Mono, but Satori needs
// TTF/OTF and both ship WOFF2-only. The image uses
// Geist and Geist Mono throughout — the display face
// is identical, the body face is a near neighbour.
// ==============================================
import { ImageResponse } from "@vercel/og"
import { readableText, STEPS, getSwatch } from "../src/lib/color.js"
import { buildPalette } from "../src/lib/recommend.js"
import { allRamps } from "../src/lib/semantics.js"
import { resolveShareState } from "../src/lib/params.js"
import { publicOrigin } from "../src/lib/agent.js"

const PAPER = "#fdfdfc"
const INK = "#16150f"
const ASH = "#6b6a63"

// How many rows fit, and how far each is nudged so they stagger like the mock.
const ROWS = 4
const OFFSETS = [96, 0, 60, 24]

async function font(origin: string, file: string): Promise<ArrayBuffer> {
  const res = await fetch(`${origin}/fonts/${file}`)
  if (!res.ok) throw new Error(`font ${file}: ${res.status}`)
  return res.arrayBuffer()
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const origin = publicOrigin(request)
  const state = resolveShareState(url.search)

  const palette = buildPalette(
    state.brand,
    state.accentOverride,
    state.mode,
    state.scheme,
    state.accent2Override,
  )
  const excluded = new Set(state.excludedRamps)
  const ramps = allRamps(palette)
    .filter((r) => !excluded.has(r.name))
    .slice(0, ROWS)

  const [semibold, regular, mono] = await Promise.all([
    font(origin, "Geist-SemiBold.ttf"),
    font(origin, "Geist-Regular.ttf"),
    font(origin, "GeistMono-Regular.ttf"),
  ])

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: PAPER,
        fontFamily: "Geist",
        overflow: "hidden",
      }}
    >
      {/* Left — the page header, same words as the site */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: 600,
          flexShrink: 0,
          paddingLeft: 72,
          paddingRight: 28,
        }}
      >
        <div
          style={{
            fontFamily: "Geist Mono",
            fontSize: 21,
            letterSpacing: 5.5,
            color: ASH,
            marginBottom: 20,
          }}
        >
          RAMPS.STUDIO
        </div>
        <div
          style={{
            fontFamily: "Geist",
            fontWeight: 600,
            // Wraps to two lines by design — at the size a feed renders
            // this, large type on two lines reads better than small type on one.
            fontSize: 78,
            lineHeight: 0.98,
            letterSpacing: -3,
            color: INK,
            marginBottom: 22,
          }}
        >
          Color Ramp Generator
        </div>
        <div style={{ fontSize: 27, lineHeight: 1.32, color: ASH, maxWidth: 470 }}>
          Generate agent-optimized, accessible color ramps in a few clicks.
        </div>
      </div>

      {/* Right — real swatches, bleeding off the edge like the mock */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 26,
          paddingTop: 8,
        }}
      >
        {ramps.map((ramp, row) => (
          <div
            key={ramp.name}
            style={{ display: "flex", gap: 14, marginLeft: OFFSETS[row] ?? 0 }}
          >
            {STEPS.slice(0, 6).map((step) => {
              const swatch = getSwatch(ramp, step)
              return (
                <div
                  key={step}
                  style={{
                    display: "flex",
                    width: 126,
                    height: 122,
                    borderRadius: 12,
                    background: swatch.hex,
                    color: readableText(swatch.hex),
                    padding: 12,
                    fontFamily: "Geist Mono",
                    fontSize: 17,
                  }}
                >
                  {step}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  )
}
