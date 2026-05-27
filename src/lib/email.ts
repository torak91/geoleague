// Server-only Resend email helpers. Looks up recipient addresses via the
// Supabase auth admin API (profiles table has no email column) and dispatches
// per-recipient with Promise.allSettled, matching the push pipeline shape.

import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import type { EmailTemplate } from '@/lib/email-templates';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cachedClient = new Resend(apiKey);
  return cachedClient;
}

function getFrom(): string | null {
  return process.env.EMAIL_FROM ?? null;
}

function getReplyTo(): string | undefined {
  return process.env.EMAIL_REPLY_TO ?? undefined;
}

export type EmailDispatchResult = {
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
};

/**
 * Fetch auth user emails for the given user ids. Uses the service-role admin
 * API. Pages through users in 1000-row chunks; the resulting map only includes
 * users with a confirmed email address.
 */
async function fetchEmailsForUsers(
  svc: AnyClient,
  userIds: string[],
): Promise<Map<string, string>> {
  const wanted = new Set(userIds);
  const result = new Map<string, string>();
  if (wanted.size === 0) return result;

  const PAGE_SIZE = 1000;
  let page = 1;
  // Hard upper bound to avoid infinite loops if the SDK changes shape.
  const MAX_PAGES = 50;

  while (page <= MAX_PAGES) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error || !data) break;
    for (const u of data.users) {
      if (u.email && wanted.has(u.id)) result.set(u.id, u.email);
    }
    if (data.users.length < PAGE_SIZE) break;
    if (result.size === wanted.size) break;
    page += 1;
  }
  return result;
}

/**
 * Send an email template to every resolvable address for `userIds`.
 *
 * Returns a per-user status map so the caller can write notification_log rows
 * for the entire requested set, plus aggregate counts for observability.
 *
 * Users without a resolvable email, or all users when Resend/EMAIL_FROM are
 * unconfigured, are reported as 'skipped'.
 */
export async function sendEmailToUsers(
  userIds: string[],
  template: EmailTemplate,
): Promise<{
  result: EmailDispatchResult;
  perUser: Map<string, 'sent' | 'failed' | 'skipped'>;
}> {
  const perUser = new Map<string, 'sent' | 'failed' | 'skipped'>();
  const baseResult: EmailDispatchResult = { attempted: 0, sent: 0, failed: 0, skipped: 0 };

  if (userIds.length === 0) return { result: baseResult, perUser };

  const client = getClient();
  const from = getFrom();
  if (!client || !from) {
    for (const id of userIds) {
      perUser.set(id, 'skipped');
      baseResult.skipped += 1;
    }
    return { result: baseResult, perUser };
  }

  const svc = createSupabaseServiceClient();
  const emails = await fetchEmailsForUsers(svc, userIds);

  const replyTo = getReplyTo();

  await Promise.allSettled(
    userIds.map(async (userId) => {
      const to = emails.get(userId);
      if (!to) {
        perUser.set(userId, 'skipped');
        baseResult.skipped += 1;
        return;
      }
      baseResult.attempted += 1;
      try {
        const { error } = await client.emails.send({
          from,
          to,
          subject: template.subject,
          html: template.html,
          text: template.text,
          ...(replyTo ? { replyTo } : {}),
        });
        if (error) throw new Error(error.message);
        perUser.set(userId, 'sent');
        baseResult.sent += 1;
      } catch {
        perUser.set(userId, 'failed');
        baseResult.failed += 1;
      }
    }),
  );

  return { result: baseResult, perUser };
}
