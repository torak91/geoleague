import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { HEADINGS, imagePublicUrl } from '@/lib/r2';
import { PlayClient } from './PlayClient';

export default async function PlayPage({ params }: { params: { challengeId: string } }) {
  const { user, supabase } = await requireUser();

  // 1. Verify the challenge is currently active (window open, published).
  //    active_challenge_public hides lat/lng and only includes rows whose
  //    window has not yet elapsed.
  const { data: challenge } = await supabase
    .from('active_challenge_public')
    .select('id, image_prefix, window_closes_at')
    .eq('id', params.challengeId)
    .maybeSingle();

  if (!challenge) {
    // Either the challenge does not exist, is unpublished, or its window
    // has already closed. Bounce home — the home page will show the right
    // empty/closed state for the user.
    redirect('/');
  }

  // The view's WHERE clause guarantees published_at / window_closes_at are
  // present and id / image_prefix are non-null, but the generated types
  // mark them nullable. Narrow explicitly so the rest of the file stays
  // type-safe without `!` sprinkled everywhere.
  const { id: challengeId, image_prefix, window_closes_at } = challenge;
  if (!challengeId || !image_prefix || !window_closes_at) {
    redirect('/');
  }

  // 2. If the user has already played this challenge, jump to their result.
  const { data: existingPlay } = await supabase
    .from('plays')
    .select('id')
    .eq('user_id', user.id)
    .eq('challenge_id', challengeId)
    .maybeSingle();

  if (existingPlay) {
    redirect(`/result/${existingPlay.id}`);
  }

  const imageUrls = HEADINGS.map((h) => imagePublicUrl(image_prefix, h));

  // Approximate day of year for the challenge header
  const now = new Date();
  const dayOfYear = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

  return (
    <PlayClient
      challengeId={challengeId}
      imageUrls={imageUrls}
      windowClosesAt={window_closes_at}
      day={dayOfYear}
    />
  );
}
