import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

function statusLabel(c: {
  published_at: string | null;
  window_closes_at: string | null;
}): string {
  if (!c.published_at) return 'Programmata';
  if (c.window_closes_at && new Date(c.window_closes_at).getTime() > Date.now()) return 'Attiva';
  return 'Chiusa';
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = createSupabaseServiceClient();

  const { data: challenges } = await supabase
    .from('challenges')
    .select('id, scheduled_for, publish_after_hour, difficulty, region, location_label, published_at, window_closes_at')
    .order('scheduled_for', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Sfide</h1>
        <Link
          href="/admin/challenges/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Nuova sfida
        </Link>
      </div>

      {!challenges || challenges.length === 0 ? (
        <p className="text-sm text-neutral-600">Nessuna sfida programmata.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {challenges.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/challenges/${c.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-50"
              >
                <span className="font-medium">{c.scheduled_for} · {c.publish_after_hour}:00</span>
                <span className="flex items-center gap-3 text-neutral-600">
                  <span>{c.region}</span>
                  <span>·</span>
                  <span>{c.difficulty}</span>
                  {c.location_label ? (
                    <>
                      <span>·</span>
                      <span className="max-w-[180px] truncate">{c.location_label}</span>
                    </>
                  ) : null}
                  <span>·</span>
                  <span className="font-medium text-neutral-900">{statusLabel(c)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
