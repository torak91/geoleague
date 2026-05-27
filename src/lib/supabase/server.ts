import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { env } from '@/lib/env';
import type { Database } from './database.types';

/**
 * Server-side Supabase client bound to the current request's cookies.
 * Use inside RSCs, Route Handlers, and Server Actions.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component — cookies are read-only.
          // The middleware refresh path handles persistence.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // see above
        }
      },
    },
  });
}
