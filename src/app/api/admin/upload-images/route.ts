import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/auth';
import { presignAllHeadings } from '@/lib/r2';

export async function POST() {
  await requireAdmin();

  const prefix = `challenges/${randomUUID()}`;
  const urls = await presignAllHeadings(prefix);

  return NextResponse.json({ prefix, urls });
}
