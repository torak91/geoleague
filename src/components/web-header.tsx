'use client'
// src/components/web-header.tsx
// Desktop header used on Home and Result. Logo left, primary nav center,
// date + avatar right. Active nav item gets ink color + medium weight.

import * as React from 'react'
import Link from 'next/link'
import { LogoLockup, Tabular } from '@/components/brand'

export type NavId = 'today' | 'leaderboard' | 'archive' | 'profile'

const ITEMS: { id: NavId; label: string; href: string }[] = [
  { id: 'today',       label: 'Oggi',       href: '/' },
  { id: 'leaderboard', label: 'Classifica', href: '/leaderboard' },
  { id: 'archive',     label: 'Archivio',   href: '/leaderboard' },
  { id: 'profile',     label: 'Profilo',    href: '/profile' },
]

export function WebHeader({
  active,
  todayShort,
  userInitials = 'tu',
  onTone = 'paper',
}: {
  active: NavId
  todayShort: string         // e.g. "Mer · 27/05"
  userInitials?: string
  onTone?: 'paper' | 'dark'  // dark = overlaid on a dark hero (e.g. challenge page)
}) {
  const dark = onTone === 'dark'
  return (
    <header className="relative z-20 flex items-center justify-between px-12 py-5">
      <Link href="/" className={dark ? 'text-cream' : 'text-ink'}>
        <LogoLockup size={20} />
      </Link>
      <nav className={`flex items-center gap-8 text-[13px] ${dark ? 'text-cream/65' : 'text-subink'}`}>
        {ITEMS.map((it) => {
          const isActive = it.id === active
          return (
            <Link
              key={it.id}
              href={it.href}
              className={
                isActive
                  ? dark ? 'font-medium text-cream' : 'font-medium text-ink'
                  : ''
              }
            >
              {it.label}
            </Link>
          )
        })}
      </nav>
      <div className={`flex items-center gap-3 text-[12px] ${dark ? 'text-cream/55' : 'text-subink'}`}>
        <Tabular>{todayShort}</Tabular>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold ${
            dark ? 'bg-cream/15 text-cream' : 'bg-[#D8CFBE] text-ink'
          }`}
        >
          {userInitials}
        </div>
      </div>
    </header>
  )
}
