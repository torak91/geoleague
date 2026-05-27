import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { t, type TranslationKey } from '@/lib/i18n';
import { logoutAction } from '@/app/actions';
import { updateDisplayNameAction } from './actions';
import { NotificationOptIn } from '@/components/Settings/NotificationOptIn';

const errorMap: Record<string, TranslationKey> = {
  too_long: 'settings.error.too_long',
  generic: 'settings.error.generic',
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const { user, supabase } = await requireUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const errorKey = searchParams.error && errorMap[searchParams.error];
  const errorMsg = errorKey ? t[errorKey] : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {t['brand.name']}
        </Link>
        <span className="text-sm text-neutral-600">{user.email}</span>
      </header>

      <section>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t['settings.title']}</h1>
        <form action={updateDisplayNameAction} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              {t['settings.display_name']}
            </span>
            <input
              name="display_name"
              type="text"
              maxLength={32}
              defaultValue={profile?.display_name ?? ''}
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-base outline-none focus:border-neutral-900"
            />
            <span className="mt-1 block text-xs text-neutral-500">
              {t['settings.display_name_help']}
            </span>
          </label>
          {errorMsg ? (
            <p role="alert" className="text-sm text-red-600">
              {errorMsg}
            </p>
          ) : null}
          {searchParams.saved ? (
            <p role="status" className="text-sm text-green-700">
              {t['settings.saved']}
            </p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-base font-medium text-white hover:bg-neutral-800"
          >
            {t['settings.save']}
          </button>
        </form>
      </section>

      <NotificationOptIn vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />

      <section>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm"
          >
            {t['settings.logout']}
          </button>
        </form>
      </section>
    </div>
  );
}
