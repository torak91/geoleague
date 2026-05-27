import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from './database.types';

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY in server-only code
 * paths (cron routes, webhooks, admin server actions). Never import in a
 * client component or expose to the browser bundle.
 */
export function createSupabaseServiceClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
