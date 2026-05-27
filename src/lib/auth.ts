import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Loads the current user from the request cookies. Redirects to /login if
 * unauthenticated. Returns both the user and the bound supabase client so
 * callers don't recreate it.
 */
export async function requireUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  return { user, supabase };
}

/**
 * Same as requireUser but additionally enforces profiles.is_admin = true.
 * Redirects non-admins to the home page (never reveals that an admin area
 * exists).
 */
export async function requireAdmin() {
  const { user, supabase } = await requireUser();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile?.is_admin) {
    redirect('/');
  }
  return { user, supabase };
}

/**
 * Lightweight current-user fetch for pages that render either logged-in or
 * logged-out states (e.g. the home page) without redirecting.
 */
export async function getCurrentUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase };
}
