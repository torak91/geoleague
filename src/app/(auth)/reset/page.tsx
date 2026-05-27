import Link from 'next/link';
import { t, type TranslationKey } from '@/lib/i18n';
import { requestResetAction, updatePasswordAction } from './actions';

const errorMap: Record<string, TranslationKey> = {
  email_invalid: 'auth.error.email_invalid',
  password_short: 'auth.error.password_short',
  generic: 'auth.error.generic',
};

export default function ResetPage({
  searchParams,
}: {
  searchParams: { step?: string; sent?: string; error?: string };
}) {
  const errorKey = searchParams.error && errorMap[searchParams.error];
  const errorMsg = errorKey ? t[errorKey] : null;

  if (searchParams.step === 'update') {
    return (
      <>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          {t['auth.reset.update_title']}
        </h1>
        <form action={updatePasswordAction} className="space-y-4">
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
            {t['auth.reset.update_submit']}
          </button>
        </form>
      </>
    );
  }

  if (searchParams.sent) {
    return (
      <>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">{t['auth.reset.title']}</h1>
        <p className="text-sm text-neutral-700">{t['auth.reset.sent']}</p>
        <p className="mt-6 text-sm text-neutral-600">
          <Link href="/login" className="underline">
            {t['auth.reset.back']}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t['auth.reset.title']}</h1>
      <form action={requestResetAction} className="space-y-4">
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
        {errorMsg ? (
          <p role="alert" className="text-sm text-red-600">
            {errorMsg}
          </p>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-base font-medium text-white hover:bg-neutral-800"
        >
          {t['auth.reset.submit']}
        </button>
      </form>
      <p className="mt-6 text-sm text-neutral-600">
        <Link href="/login" className="underline">
          {t['auth.reset.back']}
        </Link>
      </p>
    </>
  );
}
