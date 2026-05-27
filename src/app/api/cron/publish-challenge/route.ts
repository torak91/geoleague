import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { publishProbability, romeDateIso, romeHourMinute } from '@/lib/time';
import { sendPushToUsers } from '@/lib/push';
import { sendEmailToUsers } from '@/lib/email';
import { launchEmail } from '@/lib/email-templates';
import {
  fetchAlreadyNotifiedUserIds,
  fetchEmailRecipientUserIds,
  insertNotificationLogs,
} from '@/lib/notifications';

// Force Node.js runtime (not Edge) so the service-role Supabase client works.
export const runtime = 'nodejs';
// Never cache cron responses.
export const dynamic = 'force-dynamic';

const WINDOW_HOURS = 2;

type PublishOutcome =
  | { status: 'published'; challenge_id: string; published_at: string; window_closes_at: string }
  | { status: 'skipped'; reason: string }
  | { status: 'no_challenge' };

export async function GET(request: NextRequest) {
  // ---- Auth ---------------------------------------------------------------
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.json({ ok: false, error: 'misconfigured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // ---- Window gate --------------------------------------------------------
  const now = new Date();
  const { hour, minute } = romeHourMinute(now);
  const probability = publishProbability(hour, minute);
  if (probability === 0) {
    return NextResponse.json<{ ok: true } & PublishOutcome>({
      ok: true,
      status: 'skipped',
      reason: 'outside_window',
    });
  }

  // ---- Today's challenge --------------------------------------------------
  const today = romeDateIso(now);
  const svc = createSupabaseServiceClient();

  const { data: challenge, error: lookupError } = await svc
    .from('challenges')
    .select('id')
    .eq('scheduled_for', today)
    .is('published_at', null)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ ok: false, error: 'lookup_failed', detail: lookupError.message }, {
      status: 500,
    });
  }

  if (!challenge) {
    return NextResponse.json<{ ok: true } & PublishOutcome>({
      ok: true,
      status: 'no_challenge',
    });
  }

  // ---- Probability dice ---------------------------------------------------
  // probability === 1 → forced publish (16:30+).
  if (probability < 1 && Math.random() >= probability) {
    return NextResponse.json<{ ok: true } & PublishOutcome>({
      ok: true,
      status: 'skipped',
      reason: 'dice_roll',
    });
  }

  // ---- Publish ------------------------------------------------------------
  // Single atomic update: only publishes if still unpublished. Race-safe.
  const publishedAt = new Date().toISOString();
  const windowClosesAt = new Date(Date.now() + WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  const { data: updated, error: updateError } = await svc
    .from('challenges')
    .update({ published_at: publishedAt, window_closes_at: windowClosesAt })
    .eq('id', challenge.id)
    .is('published_at', null)
    .select('id, published_at, window_closes_at')
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ ok: false, error: 'update_failed', detail: updateError.message }, {
      status: 500,
    });
  }

  if (!updated) {
    // Another cron firing won the race.
    return NextResponse.json<{ ok: true } & PublishOutcome>({
      ok: true,
      status: 'skipped',
      reason: 'race_lost',
    });
  }

  // ---- Notification fan-out --------------------------------------------
  // Push and email run sequentially but independently. The log table
  // de-duplicates each channel separately via the unique
  // (challenge_id, user_id, channel, kind) constraint, so a cron retry after
  // partial failure only resends the channels that have not yet been logged.
  await dispatchLaunchPush(svc, updated.id);
  await dispatchLaunchEmail(svc, updated.id);

  return NextResponse.json<{ ok: true } & PublishOutcome>({
    ok: true,
    status: 'published',
    challenge_id: updated.id,
    published_at: updated.published_at!,
    window_closes_at: updated.window_closes_at!,
  });
}

async function dispatchLaunchPush(
  svc: ReturnType<typeof createSupabaseServiceClient>,
  challengeId: string,
) {
  // All users who opted in to push for the launch kind.
  const { data: targets } = await svc
    .from('profiles')
    .select('id')
    .in('notification_channel', ['push', 'both']);

  if (!targets || targets.length === 0) return;

  const userIds = targets.map((t) => t.id);

  // Exclude users we already pushed for this challenge (cron retry safety).
  const alreadyNotified = await fetchAlreadyNotifiedUserIds(svc, challengeId, 'push', 'launch');
  const sentSet = new Set(alreadyNotified);
  const pending = userIds.filter((id) => !sentSet.has(id));
  if (pending.length === 0) return;

  const { perUser } = await sendPushToUsers(pending, {
    title: 'GeoLeague',
    body: 'La sfida di oggi è pronta. Hai 2 ore per giocare.',
    url: '/',
    tag: `launch-${challengeId}`,
  });

  await insertNotificationLogs(
    svc,
    Array.from(perUser.entries()).map(([userId, status]) => ({
      challenge_id: challengeId,
      user_id: userId,
      channel: 'push',
      kind: 'launch',
      status,
    })),
  );
}

async function dispatchLaunchEmail(
  svc: ReturnType<typeof createSupabaseServiceClient>,
  challengeId: string,
) {
  // Users eligible by channel preference or by staleness (>3 days).
  const STALE_DAYS = 3;
  const stalenessCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const userIds = await fetchEmailRecipientUserIds(svc, stalenessCutoff);
  if (userIds.length === 0) return;

  // Exclude users we already emailed for this challenge (cron retry safety).
  const alreadyNotified = await fetchAlreadyNotifiedUserIds(svc, challengeId, 'email', 'launch');
  const sentSet = new Set(alreadyNotified);
  const pending = userIds.filter((id) => !sentSet.has(id));
  if (pending.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const template = launchEmail({ appUrl });
  const { perUser } = await sendEmailToUsers(pending, template);

  await insertNotificationLogs(
    svc,
    Array.from(perUser.entries()).map(([userId, status]) => ({
      challenge_id: challengeId,
      user_id: userId,
      channel: 'email',
      kind: 'launch',
      status,
    })),
  );
}
