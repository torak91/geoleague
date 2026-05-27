import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { deleteSubscriptionByEndpoint } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  endpoint: z.string().url().max(2048),
});

export async function POST(request: NextRequest) {
  const { user, supabase } = await requireUser();

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

  const { error } = await deleteSubscriptionByEndpoint(supabase, parsed.data.endpoint, user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: 'db_failed', detail: error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
