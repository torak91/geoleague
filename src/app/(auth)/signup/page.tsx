import Link from 'next/link';
import { redirect } from 'next/navigation';
import { t, type TranslationKey } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { signupAction } from './actions';

const errorMap: Record<string, TranslationKey> = {
  email_invalid: 'auth.error.email_invalid',
  password_short: 'auth.error.password_short',
  email_already_registered: 'auth.error.email_already_registered',
  generic: 'auth.error.generic',
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string; sent?: string };
}) {
  const { user } = await getCurrentUser();
  if (user) redirect('/');

  if (searchParams.sent) {
    return (
      <>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">{t['auth.signup.title']}</h1>
        <p className="text-sm text-neutral-700">{t['auth.signup.check_email']}</p>
        <p className="mt-6 text-sm text-neutral-600">
          <Link href="/login" className="underline">
            {t['auth.signup.login_link']}
          </Link>
        </p>
      </>
    );
  }

  const errorKey = searchParams.error && errorMap[searchParams.error];
  const errorMsg = errorKey ? t[errorKey] : null;

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t['auth.signup.title']}</h1>
      <form action={signupAction} className="space-y-4">
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
            autoComplete="new-password"
            minLength={8}
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
          {t['auth.signup.submit']}
        </button>
      </form>
      <p className="mt-6 text-sm text-neutral-600">
        {t['auth.signup.have_account']}{' '}
        <Link href="/login" className="underline">
          {t['auth.signup.login_link']}
        </Link>
      </p>
    </>
  );
}
