import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { upsertSubscription } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
});

export async function POST(request: NextRequest) {
  const { user, supabase } = await requireUser();
  const userAgent = request.headers.get('user-agent')?.slice(0, 512) ?? null;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const { error } = await upsertSubscription(supabase, {
    user_id: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    user_agent: userAgent,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: 'db_failed', detail: error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
