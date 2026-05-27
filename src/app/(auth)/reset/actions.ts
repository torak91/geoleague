'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

const emailSchema = z.object({ email: z.string().email() });
const passwordSchema = z.object({ password: z.string().min(8) });

export async function requestResetAction(formData: FormData) {
  const parsed = emailSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    redirect('/reset?error=email_invalid');
  }

  const supabase = createSupabaseServerClient();
  // Do not branch on the result — we always show the same neutral message
  // so the form cannot be used as an account enumeration oracle.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/callback?next=/reset?step=update`,
  });

  redirect('/reset?sent=1');
}

export async function updatePasswordAction(formData: FormData) {
  const parsed = passwordSchema.safeParse({ password: formData.get('password') });
  if (!parsed.success) {
    redirect('/reset?step=update&error=password_short');
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    redirect('/reset?step=update&error=generic');
  }

  redirect('/');
}
