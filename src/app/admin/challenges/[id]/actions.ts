'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

const idSchema = z.string().uuid();

export async function publishNowAction(formData: FormData) {
  const id = idSchema.parse(formData.get('id'));
  await requireAdmin();
  const supabase = createSupabaseServiceClient();

  const now = new Date();
  // Close any other active window first (keeps maybeSingle() safe).
  await supabase
    .from('challenges')
    .update({ window_closes_at: now.toISOString() })
    .not('window_closes_at', 'is', null)
    .gt('window_closes_at', now.toISOString())
    .neq('id', id);

  const windowClose = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const { error } = await supabase
    .from('challenges')
    .update({
      published_at: now.toISOString(),
      window_closes_at: windowClose.toISOString(),
    })
    .eq('id', id);

  if (error) {
    redirect(`/admin/challenges/${id}?error=publish_failed`);
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/challenges/${id}`);
  redirect(`/admin/challenges/${id}?published=1`);
}

export async function unpublishAction(formData: FormData) {
  const id = idSchema.parse(formData.get('id'));
  await requireAdmin();
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from('challenges')
    .update({ published_at: null, window_closes_at: null })
    .eq('id', id);

  if (error) {
    redirect(`/admin/challenges/${id}?error=unpublish_failed`);
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/challenges/${id}`);
  redirect(`/admin/challenges/${id}?unpublished=1`);
}
