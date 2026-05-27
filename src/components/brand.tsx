// src/components/brand.tsx
// Logo lockup, mark, and Tabular helper.
// Pure render — no client features. Safe in server components.

import * as React from 'react'

const FLAME = '#DA5520'

export type LogoLockupProps = {
  size?: number
  className?: string
  color?: string
  accent?: string
  showWordmark?: boolean
}

export function LogoLockup({
  size = 20,
  className,
  color = 'currentColor',
  accent = FLAME,
  showWordmark = true,
}: LogoLockupProps) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.4,
        color,
      }}
    >
      <LogoMark size={size} color={color} accent={accent} />
      {showWordmark && (
        <span
          className="font-display font-medium leading-none"
          style={{ fontSize: size * 0.9, letterSpacing: '-0.02em' }}
        >
          geoleague
        </span>
      )}
    </div>
  )
}

export function LogoMark({
  size = 24,
  color = 'currentColor',
  accent = FLAME,
}: {
  size?: number
  color?: string
  accent?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="GeoLeague">
      <circle cx="16" cy="16" r="13.5" fill="none" stroke={color} strokeWidth="1.6" />
      <line x1="16" y1="0.5" x2="16" y2="5.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3" fill={accent} />
    </svg>
  )
}

/**
 * Wraps children with tabular-nums + tnum feature.
 * Use around any score, distance, time, rank, or coordinate.
 */
export function Tabular({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={className}
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum"',
      }}
    >
      {children}
    </span>
  )
}
