import Link from 'next/link';
import { redirect } from 'next/navigation';
import { t, type TranslationKey } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { loginAction } from './actions';

const errorMap: Record<string, TranslationKey> = {
  invalid_credentials: 'auth.error.invalid_credentials',
  email_invalid: 'auth.error.email_invalid',
  session_expired: 'auth.error.session_expired',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const { user } = await getCurrentUser();
  if (user) redirect('/');

  const errorKey = searchParams.error && errorMap[searchParams.error];
  const errorMsg = errorKey ? t[errorKey] : null;

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t['auth.login.title']}</h1>
      <form action={loginAction} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">{t['common.email']}</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-base outline-none focus:border-neutral-900"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">{t['common.password']}</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-base outline-none focus:border-neutral-900"
          />
        </label>
        {errorMsg ? (
          <p role="alert" className="text-sm text-red-600">
            {errorMsg}
          </p>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-base font-medium text-white hover:bg-neutral-800"
        >
          {t['auth.login.submit']}
        </button>
      </form>
      <div className="mt-6 space-y-2 text-sm text-neutral-600">
        <p>
          <Link href="/reset" className="underline">
            {t['auth.login.forgot']}
          </Link>
        </p>
        <p>
          {t['auth.login.no_account']}{' '}
          <Link href="/signup" className="underline">
            {t['auth.login.signup_link']}
          </Link>
        </p>
      </div>
    </>
  );
}
