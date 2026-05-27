'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

const schema = z.object({
  image_prefix: z.string().min(1),
  scheduled_for: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date'),
  publish_after_hour: z.number().int().min(0).max(23),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  region: z.enum(['nord', 'centro', 'sud', 'isole']),
  location_label: z.string().max(120).optional().nullable(),
  auto_publish: z.boolean().optional(),
});

export type CreateChallengeInput = z.infer<typeof schema>;

export async function createChallengeAction(input: CreateChallengeInput) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: 'invalid_input' };
  }

  const { user } = await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const { auto_publish, ...fields } = parsed.data;

  const payload = {
    scheduled_for: fields.scheduled_for,
    publish_after_hour: fields.publish_after_hour,
    lat: fields.lat,
    lng: fields.lng,
    image_prefix: fields.image_prefix,
    difficulty: fields.difficulty,
    region: fields.region,
    location_label: fields.location_label ?? null,
    created_by: user.id,
  };

  // When auto_publish: upsert so repeated test submissions don't hit the unique constraint.
  let challengeId: string;

  if (auto_publish) {
    const { data, error } = await supabase
      .from('challenges')
      .upsert(
        { ...payload, published_at: null, window_closes_at: null },
        { onConflict: 'scheduled_for,publish_after_hour' },
      )
      .select('id')
      .single();

    if (error || !data) {
      return { ok: false as const, error: 'db_failed', detail: error?.message ?? 'no data' };
    }
    challengeId = data.id;

    // Delete existing plays so admin can replay the same challenge.
    await supabase.from('plays').delete().eq('challenge_id', challengeId);

    // Close any other active window.
    const now = new Date();
    await supabase
      .from('challenges')
      .update({ window_closes_at: now.toISOString() })
      .not('window_closes_at', 'is', null)
      .gt('window_closes_at', now.toISOString())
      .neq('id', challengeId);

    const windowClose = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    await supabase
      .from('challenges')
      .update({ published_at: now.toISOString(), window_closes_at: windowClose.toISOString() })
      .eq('id', challengeId);
  } else {
    const { data, error } = await supabase
      .from('challenges')
      .insert(payload)
      .select('id')
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        return { ok: false as const, error: 'duplicate_date' };
      }
      return { ok: false as const, error: 'db_failed', detail: error?.message ?? 'no data' };
    }
    challengeId = data.id;
  }

  revalidatePath('/admin');
  redirect(`/admin/challenges/${challengeId}`);
}
