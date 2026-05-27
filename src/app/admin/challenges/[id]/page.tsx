import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { HEADINGS, imagePublicUrl } from '@/lib/r2';
import { publishNowAction, unpublishAction } from './actions';

export default async function ChallengeInspectPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { published?: string; unpublished?: string; error?: string };
}) {
  await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!challenge) notFound();

  const isPublished = !!challenge.published_at;
  const isActive =
    isPublished &&
    challenge.window_closes_at &&
    new Date(challenge.window_closes_at).getTime() > Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sfida {challenge.scheduled_for}</h1>
        <Link href="/admin" className="text-sm underline">
          ← Torna
        </Link>
      </div>

      {searchParams.published ? (
        <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">
          Sfida pubblicata.
        </p>
      ) : null}
      {searchParams.unpublished ? (
        <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Pubblicazione annullata.
        </p>
      ) : null}
      {searchParams.error ? (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">
          Errore: {searchParams.error}
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        <dt className="font-medium text-neutral-600">Coordinate</dt>
        <dd>
          {challenge.lat}, {challenge.lng}
        </dd>
        <dt className="font-medium text-neutral-600">Difficoltà</dt>
        <dd>{challenge.difficulty}</dd>
        <dt className="font-medium text-neutral-600">Regione</dt>
        <dd>{challenge.region}</dd>
        <dt className="font-medium text-neutral-600">Etichetta</dt>
        <dd>{challenge.location_label ?? '—'}</dd>
        <dt className="font-medium text-neutral-600">Stato</dt>
        <dd>
          {isActive ? 'Attiva' : isPublished ? 'Chiusa' : 'Programmata'}
          {challenge.published_at ? ` · pubblicata ${challenge.published_at}` : ''}
        </dd>
        <dt className="font-medium text-neutral-600">Prefix R2</dt>
        <dd className="font-mono text-xs">{challenge.image_prefix}</dd>
      </dl>

      <div className="flex gap-3">
        {!isPublished ? (
          <form action={publishNowAction}>
            <input type="hidden" name="id" value={challenge.id} />
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white"
            >
              Pubblica ora (test)
            </button>
          </form>
        ) : (
          <form action={unpublishAction}>
            <input type="hidden" name="id" value={challenge.id} />
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
            >
              Annulla pubblicazione
            </button>
          </form>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Anteprime</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HEADINGS.map((h) => (
            <figure key={h} className="space-y-1">
              <div className="relative aspect-video overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                <Image
                  src={imagePublicUrl(challenge.image_prefix, h)}
                  alt={`Heading ${h}°`}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <figcaption className="text-center text-xs text-neutral-600">{h}°</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
