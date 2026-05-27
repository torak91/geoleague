'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

const schema = z.object({
  image_prefix: z.string().min(1),
  scheduled_for: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date'),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  region: z.enum(['nord', 'centro', 'sud', 'isole']),
  location_label: z.string().max(120).optional().nullable(),
});

export type CreateChallengeInput = z.infer<typeof schema>;

export async function createChallengeAction(input: CreateChallengeInput) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: 'invalid_input' };
  }

  const { user } = await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      scheduled_for: parsed.data.scheduled_for,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      image_prefix: parsed.data.image_prefix,
      difficulty: parsed.data.difficulty,
      region: parsed.data.region,
      location_label: parsed.data.location_label ?? null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      return { ok: false as const, error: 'duplicate_date' };
    }
    return { ok: false as const, error: 'db_failed' };
  }

  revalidatePath('/admin');
  redirect(`/admin/challenges/${data.id}`);
}
