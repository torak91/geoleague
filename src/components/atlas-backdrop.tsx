// src/components/atlas-backdrop.tsx
// Decorative backdrop for the Home page.
//   - Faint coordinate grid (CSS pattern)
//   - Edge ticks: longitude top, latitude left, both monospaced
//   - Globe wireframe: lat/lon ellipses, equator + prime meridian in flame
//   - Today's location marker (decorative dot — NOT the day's real coordinate)
//   - Coordinate readout label
//
// Pure SVG/CSS. Safe in server components.

import * as React from 'react'

const FLAME = '#DA5520'
const INK   = '#16140F'

export function AtlasBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-ink">
      {/* coordinate grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.06]" preserveAspectRatio="none">
        <defs>
          <pattern id="atlas-grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#atlas-grid)" />
      </svg>

      {/* longitude ticks along top */}
      <div className="absolute inset-x-12 top-20 flex justify-between font-mono text-[9px] opacity-30">
        {['8°E', '10°E', '12°E', '14°E', '16°E', '18°E'].map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>

      {/* latitude ticks along left */}
      <div className="absolute inset-y-24 left-3 flex flex-col justify-between font-mono text-[9px] opacity-30">
        {['46°N', '44°N', '42°N', '40°N', '38°N'].map((s) => (
          <span key={s} style={{ writingMode: 'vertical-rl' }}>
            {s}
          </span>
        ))}
      </div>

      <GlobeWireframe />

      {/* monospaced lat/lon readout in lower-left */}
      <div className="absolute left-12 bottom-10 font-mono text-[10px] text-subink opacity-50">
        <div>46°26′N · 12°22′E</div>
        <div className="mt-0.5 opacity-70">localizzazione nascosta</div>
      </div>
    </div>
  )
}

export function GlobeWireframe() {
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ right: '-12%', bottom: '-18%', width: '78%', height: '120%' }}
      viewBox="-100 -100 200 200"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* soft disc */}
      <circle cx="0" cy="0" r="95" fill={FLAME} fillOpacity={0.045} />
      <circle cx="0" cy="0" r="95" fill="none" stroke={INK} strokeWidth="0.4" opacity="0.35" />

      {/* latitudes */}
      {[-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75].map((lat) => {
        const r = 95 * Math.cos((lat * Math.PI) / 180)
        const y = 95 * Math.sin((lat * Math.PI) / 180)
        const isEquator = lat === 0
        return (
          <ellipse
            key={lat}
            cx="0"
            cy={y}
            rx={r}
            ry={r * 0.16}
            fill="none"
            stroke={isEquator ? FLAME : INK}
            strokeWidth={isEquator ? 0.5 : 0.3}
            opacity={isEquator ? 0.55 : 0.28}
          />
        )
      })}

      {/* longitudes (great-circle ellipses) */}
      {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5].map((lon) => {
        const isPrime = lon === 90
        const rx = 95 * Math.abs(Math.cos((lon * Math.PI) / 180))
        return (
          <ellipse
            key={lon}
            cx="0"
            cy="0"
            rx={rx}
            ry={95}
            fill="none"
            stroke={isPrime ? FLAME : INK}
            strokeWidth={isPrime ? 0.5 : 0.3}
            opacity={isPrime ? 0.55 : 0.28}
          />
        )
      })}

      {/* polar ticks */}
      <line x1="0" y1="-95"  x2="0" y2="-100" stroke={INK} strokeWidth="0.4" opacity="0.4" />
      <line x1="0" y1="95"   x2="0" y2="100"  stroke={INK} strokeWidth="0.4" opacity="0.4" />

      {/* decorative marker over Italy region (NOT the day's real coordinate) */}
      <g transform="translate(8, -33)">
        <circle r="10"  fill={FLAME} opacity={0.10} />
        <circle r="5"   fill={FLAME} opacity={0.30} />
        <circle r="2.2" fill={FLAME} />
        <line x1="2" y1="-2" x2="22" y2="-18" stroke={FLAME} strokeWidth="0.4" opacity="0.5" />
      </g>
      <text
        x="34"
        y="-50"
        fill={FLAME}
        fontSize="3.4"
        fontFamily="JetBrains Mono, monospace"
        opacity="0.85"
        letterSpacing="0.3"
      >
        46°26′N · 12°22′E
      </text>
    </svg>
  )
}
