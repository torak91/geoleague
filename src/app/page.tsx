import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { logoutAction } from './actions';

export default async function HomePage() {
  const { user, supabase } = await getCurrentUser();

  // Active challenge — visible to both authenticated and anon (via the
  // active_challenge_public view).
  const { data: challenge } = await supabase
    .from('active_challenge_public')
    .select('id, window_closes_at')
    .maybeSingle();

  let existingPlayId: string | null = null;
  if (user && challenge?.id) {
    const { data: play } = await supabase
      .from('plays')
      .select('id')
      .eq('user_id', user.id)
      .eq('challenge_id', challenge.id)
      .maybeSingle();
    existingPlayId = play?.id ?? null;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-4">
        <span className="text-lg font-semibold tracking-tight">{t['brand.name']}</span>
        {user ? (
          <div className="flex items-center gap-3 text-sm">
            <Link href="/leaderboard" className="text-neutral-700 underline">
              {t['nav.leaderboard']}
            </Link>
            <Link href="/profile" className="text-neutral-700 underline">
              {t['nav.profile']}
            </Link>
            <Link href="/settings" className="text-neutral-700 underline">
              {t['nav.settings']}
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-neutral-700 underline">
                {t['settings.logout']}
              </button>
            </form>
          </div>
        ) : (
          <Link href="/login" className="text-sm underline">
            {t['auth.login.title']}
          </Link>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t['brand.name']}</h1>
          <p className="mt-2 text-neutral-600">{t['brand.tagline']}</p>
        </div>

        {!user ? (
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white"
            >
              {t['auth.login.title']}
            </Link>
            <Link href="/signup" className="text-sm underline">
              {t['auth.signup.submit']}
            </Link>
          </div>
        ) : !challenge ? (
          <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold">{t['home.no_challenge.title']}</h2>
            <p className="text-sm text-neutral-700">{t['home.no_challenge.body']}</p>
          </div>
        ) : existingPlayId ? (
          <Link
            href={`/result/${existingPlayId}`}
            className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium"
          >
            {t['home.view_result_cta']}
          </Link>
        ) : (
          <Link
            href={`/play/${challenge.id}`}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white"
          >
            {t['home.play_cta']}
          </Link>
        )}
      </main>
    </div>
  );
}
