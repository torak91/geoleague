import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-4 py-3">
        <nav className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/admin" className="text-sm font-semibold">
            GeoLeague · Admin
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/admin/challenges/new" className="underline">
              Nuova sfida
            </Link>
            <Link href="/" className="text-neutral-600">
              Sito
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
