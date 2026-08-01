// ==============================================
// ENTRY POINT
// Mounts the app into the #root element in
// index.html, pulls in the global stylesheet, and
// attaches Vercel's analytics + Core Web Vitals
// beacons (both no-op outside a Vercel deploy).
// ==============================================
import React from "react"
import ReactDOM from "react-dom/client"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import App from "./App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>,
)

// On a palette URL the server injects a plain-text + JSON copy of the palette
// into the HTML so agents that don't run JavaScript can still read it (see
// api/render.ts). It ships unstyled on purpose — hiding it with CSS would make
// readability-style extractors skip it — so the app removes it here, the moment
// we know JavaScript is running and a human is looking.
document.getElementById("agent-palette")?.remove()
