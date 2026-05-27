'use client'
// src/components/daily-card.tsx
// Hero card on the Home page. Owns the "Una via. Un panorama. Due ore."
// headline, the opens-in pill, the two CTAs, and the window metadata strip.
//
// Receives the window state from the server. Renders the right CTA + label
// based on whether the daily window is pre / live / played / closed.

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Tabular } from '@/components/brand'

export type WindowState = 'pre' | 'live' | 'played' | 'closed'

export type DailyCardProps = {
  day: number
  windowState: WindowState
  /** Pre-formatted countdown, e.g. "1h 47m" (when pre) or "0:42" min:sec (when live) */
  countdown: string
  windowStart: string         // "20:00"
  windowEnd: string           // "22:00"
  avgPlayMinutes: number      // 3
  playersToday: number        // 1284
  challengeHref?: string      // URL to navigate to when user clicks start
  resultHref?: string         // URL when state is 'played'
  onRemind?: () => void       // optional, for the remind button
}

export function DailyCard({
  day,
  windowState,
  countdown,
  windowStart,
  windowEnd,
  avgPlayMinutes,
  playersToday,
  challengeHref = '#',
  resultHref = '#',
  onRemind,
}: DailyCardProps) {
  const cta = ctaFor(windowState, windowStart)

  const primaryButton = (() => {
    if (windowState === 'live') {
      return (
        <Link
          href={challengeHref}
          className="flex items-center gap-2 rounded-2xl bg-ink px-6 py-3.5 text-[14px] font-semibold text-cream transition active:scale-[0.99]"
        >
          Inizia la sfida →
        </Link>
      )
    }
    if (windowState === 'played') {
      return (
        <Link
          href={resultHref}
          className="flex items-center gap-2 rounded-2xl bg-ink px-6 py-3.5 text-[14px] font-semibold text-cream transition active:scale-[0.99]"
        >
          Vedi il tuo risultato →
        </Link>
      )
    }
    // pre or closed — remind button or disabled
    return (
      <button
        type="button"
        onClick={onRemind}
        disabled={!onRemind}
        className="flex items-center gap-2 rounded-2xl bg-ink px-6 py-3.5 text-[14px] font-semibold text-cream transition active:scale-[0.99] disabled:opacity-50"
      >
        {cta.primaryLabel}
        <ArrowRight />
      </button>
    )
  })()

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.3, 1] }}
      className="rounded-3xl border border-black/8 bg-cream p-7 shadow-cardLg"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-widest text-subink">
          Sfida di oggi · Giorno <Tabular>{day}</Tabular>
        </p>
        <div className="flex items-center gap-1.5 rounded-full bg-black/[0.06] px-2.5 py-1 text-[10px] font-medium text-ink">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flame" />
          {windowState === 'pre' && (
            <>Apre fra <Tabular>{countdown}</Tabular></>
          )}
          {windowState === 'live' && (
            <>Restano <Tabular>{countdown}</Tabular></>
          )}
          {windowState === 'played'  && <>Hai giocato</>}
          {windowState === 'closed'  && <>Chiusa</>}
        </div>
      </div>

      <h2 className="mt-4 font-display text-[52px] font-medium leading-[0.95] tracking-tightish text-ink">
        Una via.<br />
        Un panorama.<br />
        <span className="text-subink">Due ore.</span>
      </h2>

      <div className="mt-7 flex items-center gap-3">
        {primaryButton}
        {cta.secondaryLabel && (
          <button
            type="button"
            onClick={onRemind}
            className="rounded-2xl border border-black/8 bg-transparent px-5 py-3.5 text-[13px] font-medium text-ink"
          >
            {cta.secondaryLabel}
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-black/8 pt-4 text-[12px] text-subink">
        <span>
          Finestra <Tabular className="text-ink">{windowStart} → {windowEnd}</Tabular>
        </span>
        <span>·</span>
        <span>
          ~ <span className="text-ink">{avgPlayMinutes} min</span> in media
        </span>
        <span>·</span>
        <span>{playersToday.toLocaleString('it')} giocatori oggi</span>
      </div>
    </motion.section>
  )
}

function ctaFor(state: WindowState, windowStart: string): {
  primary: 'start' | 'remind'
  primaryLabel: string
  secondaryLabel?: string
} {
  switch (state) {
    case 'pre':
      return {
        primary: 'remind',
        primaryLabel: `Avvisami alle ${windowStart}`,
        secondaryLabel: undefined,
      }
    case 'live':
      return {
        primary: 'start',
        primaryLabel: 'Inizia la sfida',
        secondaryLabel: undefined,
      }
    case 'played':
      return {
        primary: 'start',
        primaryLabel: 'Vedi il tuo risultato',
        secondaryLabel: undefined,
      }
    case 'closed':
      return {
        primary: 'start',
        primaryLabel: 'Vedi la classifica di oggi',
        secondaryLabel: undefined,
      }
  }
}

function ArrowRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  )
}
