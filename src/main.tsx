// ==============================================
// ENTRY POINT
// Mounts the app into the #root element in
// index.html, pulls in the global stylesheet, and
// attaches Vercel's analytics + Core Web Vitals
// beacons (both no-op outside a Vercel deploy).
// ==============================================
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>,
)
