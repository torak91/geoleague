'use server';

import { z } from 'zod';
import { requireUser } from '@/lib/auth';

const challengeIdSchema = z.string().uuid();
const submitSchema = z.object({
  challengeId: z.string().uuid(),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

export async function markOpenedAction(challengeId: string) {
  const id = challengeIdSchema.parse(challengeId);
  const { user, supabase } = await requireUser();

  // Idempotent: keeps the earliest opened_at across devices.
  const { error } = await supabase
    .from('challenge_opens')
    .upsert(
      { user_id: user.id, challenge_id: id },
      { onConflict: 'user_id,challenge_id', ignoreDuplicates: true },
    );

  if (error) {
    return { ok: false as const, error: 'open_failed' };
  }
  return { ok: true as const };
}

export type SubmitResult =
  | { ok: true; playId: string; totalScore: number; distanceKm: number }
  | { ok: false; error: string };

export async function submitGuessAction(
  challengeId: string,
  lat: number,
  lng: number,
): Promise<SubmitResult> {
  const parsed = submitSchema.safeParse({ challengeId, lat, lng });
  if (!parsed.success) {
    return { ok: false, error: 'invalid_guess' };
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('submit_guess', {
    p_challenge_id: parsed.data.challengeId,
    p_guess_lat: parsed.data.lat,
    p_guess_lng: parsed.data.lng,
  });

  if (error) {
    const code = String(error.code ?? '');
    const map: Record<string, string> = {
      P0001: 'window_closed',
      P0002: 'not_opened',
      P0003: 'already_submitted',
      '22023': 'invalid_guess',
      '42501': 'not_authenticated',
    };
    return { ok: false, error: map[code] ?? 'generic' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'generic' };

  return {
    ok: true,
    playId: row.play_id,
    totalScore: row.total_score,
    distanceKm: row.distance_km,
  };
}
