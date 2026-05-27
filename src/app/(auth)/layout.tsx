import Link from 'next/link';
import { t } from '@/lib/i18n';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50">
      <header className="px-4 py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {t['brand.name']}
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
}
