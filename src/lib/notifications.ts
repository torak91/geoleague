// Typed helpers for notification_subscriptions + notification_log.
// Generated database.types.ts will include these tables after the user
// runs `npm run db:types` against the pushed migration. Until then, this
// module is the single point of cast.

import type { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

export type StoredSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type NotificationChannel = 'push' | 'email';
export type NotificationKind = 'launch' | 'last_call';
export type NotificationStatus = 'sent' | 'failed' | 'skipped';

export type NotificationLogRow = {
  challenge_id: string;
  user_id: string;
  channel: NotificationChannel;
  kind: NotificationKind;
  status: NotificationStatus;
  error?: string | null;
};

export async function fetchSubscriptionsForUsers(
  supabase: AnyClient,
  userIds: string[],
): Promise<StoredSubscription[]> {
  if (userIds.length === 0) return [];
  const { data } = await supabase
    .from('notification_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);
  return (data ?? []) as StoredSubscription[];
}

export async function deleteSubscriptionById(supabase: AnyClient, id: string): Promise<void> {
  await supabase.from('notification_subscriptions').delete().eq('id', id);
}

export async function deleteSubscriptionByEndpoint(
  supabase: AnyClient,
  endpoint: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('notification_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function touchSubscriptionsLastSeen(
  supabase: AnyClient,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  await supabase
    .from('notification_subscriptions')
    .update({ last_seen_at: new Date().toISOString() })
    .in('id', ids);
}

export async function upsertSubscription(
  supabase: AnyClient,
  row: {
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    user_agent: string | null;
  },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('notification_subscriptions').upsert(
    {
      ...row,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );
  return { error: error?.message ?? null };
}

/**
 * Returns user ids eligible to receive a transactional email for the launch
 * (or any unsolicited) notification. The rule per the plan:
 *
 *   notification_channel != 'none'
 *   AND (
 *     notification_channel IN ('email','both')
 *     OR last_seen_at < now() - interval '3 days'
 *   )
 *
 * Stale users (>3 days since last_seen_at) are pulled back via email even if
 * their preferred channel is push, since push silently fails on stale devices
 * and email is the only safety net.
 */
export async function fetchEmailRecipientUserIds(
  supabase: AnyClient,
  stalenessThresholdIso: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, notification_channel, last_seen_at')
    .neq('notification_channel', 'none');
  if (!data) return [];
  const rows = data as Array<{
    id: string;
    notification_channel: string | null;
    last_seen_at: string | null;
  }>;
  return rows
    .filter((r) => {
      const channel = r.notification_channel ?? 'push';
      if (channel === 'email' || channel === 'both') return true;
      // Push-preferring user. Treat as stale only when we have a last_seen_at
      // value older than the threshold. Newly registered users (last_seen_at
      // null) are NOT auto-emailed; they get the push channel they chose.
      if (!r.last_seen_at) return false;
      return r.last_seen_at < stalenessThresholdIso;
    })
    .map((r) => r.id);
}

export async function fetchAlreadyNotifiedUserIds(
  supabase: AnyClient,
  challengeId: string,
  channel: NotificationChannel,
  kind: NotificationKind,
): Promise<string[]> {
  const { data } = await supabase
    .from('notification_log')
    .select('user_id')
    .eq('challenge_id', challengeId)
    .eq('channel', channel)
    .eq('kind', kind);
  return ((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
}

export async function insertNotificationLogs(
  supabase: AnyClient,
  rows: NotificationLogRow[],
): Promise<void> {
  if (rows.length === 0) return;
  // Unique (challenge_id, user_id, channel, kind) → safe on retry.
  await supabase.from('notification_log').insert(rows);
}
