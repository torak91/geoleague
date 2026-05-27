'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';

const schema = z.object({
  display_name: z.string().max(32),
});

export async function updateDisplayNameAction(formData: FormData) {
  const raw = (formData.get('display_name') ?? '').toString().trim();
  const parsed = schema.safeParse({ display_name: raw });
  if (!parsed.success) {
    redirect('/settings?error=too_long');
  }

  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: parsed.data.display_name || null })
    .eq('id', user.id);

  if (error) {
    redirect('/settings?error=generic');
  }

  revalidatePath('/settings');
  redirect('/settings?saved=1');
}
