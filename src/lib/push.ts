// Server-only Web Push helpers. Wraps the `web-push` library and prunes
// dead subscription rows on 404/410 responses.

import webpush, { type PushSubscription, type SendResult } from 'web-push';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import {
  deleteSubscriptionById,
  fetchSubscriptionsForUsers,
  touchSubscriptionsLastSeen,
} from '@/lib/notifications';

let configured = false;

function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export type DispatchResult = {
  attempted: number;
  sent: number;
  failed: number;
  pruned: number;
};

/**
 * Send a payload to every subscription belonging to `userIds`. Returns
 * aggregate counts; dead endpoints (404/410) are deleted automatically.
 *
 * The per-user status map covers every requested user (even those with no
 * subscriptions, marked 'skipped') so the caller can write notification_log
 * rows for the entire target set in one go.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ result: DispatchResult; perUser: Map<string, 'sent' | 'failed' | 'skipped'> }> {
  const perUser = new Map<string, 'sent' | 'failed' | 'skipped'>();
  const baseResult: DispatchResult = { attempted: 0, sent: 0, failed: 0, pruned: 0 };

  if (userIds.length === 0) return { result: baseResult, perUser };

  if (!configure()) {
    for (const id of userIds) perUser.set(id, 'skipped');
    return { result: baseResult, perUser };
  }

  const svc = createSupabaseServiceClient();
  const stored = await fetchSubscriptionsForUsers(svc, userIds);

  if (stored.length === 0) {
    for (const id of userIds) perUser.set(id, 'skipped');
    return { result: baseResult, perUser };
  }

  const body = JSON.stringify(payload);
  const successIds: string[] = [];

  await Promise.allSettled(
    stored.map(async (sub) => {
      baseResult.attempted += 1;
      const subscription: PushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        const res: SendResult = await webpush.sendNotification(subscription, body, { TTL: 60 * 60 });
        if (res.statusCode >= 200 && res.statusCode < 300) {
          baseResult.sent += 1;
          perUser.set(sub.user_id, 'sent');
          successIds.push(sub.id);
          return;
        }
        throw Object.assign(new Error(`push http ${res.statusCode}`), { statusCode: res.statusCode });
      } catch (err: unknown) {
        const code = (err as { statusCode?: number } | undefined)?.statusCode;
        if (code === 404 || code === 410) {
          await deleteSubscriptionById(svc, sub.id);
          baseResult.pruned += 1;
          if (!perUser.has(sub.user_id)) perUser.set(sub.user_id, 'failed');
        } else {
          baseResult.failed += 1;
          if (!perUser.has(sub.user_id)) perUser.set(sub.user_id, 'failed');
        }
      }
    }),
  );

  for (const id of userIds) {
    if (!perUser.has(id)) perUser.set(id, 'skipped');
  }

  await touchSubscriptionsLastSeen(svc, successIds);

  return { result: baseResult, perUser };
}
