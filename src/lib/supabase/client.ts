'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser-side Supabase client. Cached as a singleton across re-renders.
 */
export function createSupabaseBrowserClient() {
  if (cached) return cached;
  cached = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return cached;
}
