import { describe, expect, it } from 'vitest';
import { env } from '@/lib/env';

describe('env', () => {
  it('parses NODE_ENV', () => {
    expect(['development', 'test', 'production']).toContain(env.NODE_ENV);
  });

  it('provides a default NEXT_PUBLIC_APP_URL', () => {
    expect(env.NEXT_PUBLIC_APP_URL).toMatch(/^https?:\/\//);
  });
});
