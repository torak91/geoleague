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
// Each slot spans 8 hours from its publish_after_hour.
const SLOT_SPAN_HOURS = 8;

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

  const now = new Date();
  const { hour, minute } = romeHourMinute(now);

  // Skip before earliest possible slot (09:00 Rome).
  if (hour < 9) {
    return NextResponse.json<{ ok: true } & PublishOutcome>({
      ok: true,
      status: 'skipped',
      reason: 'outside_window',
    });
  }

  const svc = createSupabaseServiceClient();

  // ---- Guard: another challenge still active --------------------------------
  // Sequential model: only one challenge window open at a time.
  const { data: active } = await svc
    .from('challenges')
    .select('id')
    .not('window_closes_at', 'is', null)
    .gt('window_closes_at', now.toISOString())
    .limit(1)
    .maybeSingle();

  if (active) {
    return NextResponse.json<{ ok: true } & PublishOutcome>({
      ok: true,
      status: 'skipped',
      reason: 'challenge_active',
    });
  }

  // ---- Today's eligible candidates ----------------------------------------
  // All unpublished challenges for today whose slot has started.
  const today = romeDateIso(now);

  const { data: candidates, error: lookupError } = await svc
    .from('challenges')
    .select('id, publish_after_hour')
    .eq('scheduled_for', today)
    .is('published_at', null)
    .lte('publish_after_hour', hour)
    .order('publish_after_hour', { ascending: true });

  if (lookupError) {
    return NextResponse.json({ ok: false, error: 'lookup_failed', detail: lookupError.message }, {
      status: 500,
    });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json<{ ok: true } & PublishOutcome>({ ok: true, status: 'no_challenge' });
  }

  // Pick the first candidate still inside its publish window.
  let challenge: { id: string; publish_after_hour: number } | null = null;
  let probability = 0;
  for (const c of candidates) {
    const p = publishProbability(hour, minute, c.publish_after_hour, c.publish_after_hour + SLOT_SPAN_HOURS);
    if (p > 0) {
      challenge = c;
      probability = p;
      break;
    }
  }

  if (!challenge) {
    return NextResponse.json<{ ok: true } & PublishOutcome>({
      ok: true,
      status: 'skipped',
      reason: 'outside_window',
    });
  }

  // ---- Probability dice ---------------------------------------------------
  // probability === 1 → forced publish (at slot end - 30 min).
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
  const { data: targets } = await svc
    .from('profiles')
    .select('id')
    .in('notification_channel', ['push', 'both']);

  if (!targets || targets.length === 0) return;

  const userIds = targets.map((t) => t.id);

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
  const STALE_DAYS = 3;
  const stalenessCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const userIds = await fetchEmailRecipientUserIds(svc, stalenessCutoff);
  if (userIds.length === 0) return;

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
