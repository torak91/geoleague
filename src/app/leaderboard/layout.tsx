import Link from 'next/link';
import { t } from '@/lib/i18n';

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between text-sm">
        <Link href="/" className="font-semibold">
          {t['brand.name']}
        </Link>
        <h1 className="text-base font-semibold">{t['leaderboard.title']}</h1>
      </header>
      <nav className="flex gap-2 rounded-xl bg-neutral-100 p-1 text-sm">
        <TabLink href="/leaderboard">{t['leaderboard.tab_weekly']}</TabLink>
        <TabLink href="/leaderboard/monthly">{t['leaderboard.tab_monthly']}</TabLink>
      </nav>
      {children}
    </div>
  );
}

// Server component — uses Link only, no usePathname (which would force client).
// Both tabs are styled identically; the active one is highlighted via CSS
// `:has(...)` hooks would need client state. Simpler: visual treatment lives
// inside each page if they want to override. For MVP both stay neutral.
function TabLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex-1 rounded-lg px-3 py-1.5 text-center font-medium text-neutral-700 hover:bg-white hover:shadow-sm"
    >
      {children}
    </Link>
  );
}
