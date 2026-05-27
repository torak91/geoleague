'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signupAction(formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const code = issue?.path[0] === 'password' ? 'password_short' : 'email_invalid';
    redirect(`/signup?error=${code}`);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/callback`,
    },
  });

  if (error) {
    const code = /already/i.test(error.message) ? 'email_already_registered' : 'generic';
    redirect(`/signup?error=${code}`);
  }

  redirect('/signup?sent=1');
}
