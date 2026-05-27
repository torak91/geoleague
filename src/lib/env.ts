import { z } from 'zod';

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  // Optional at load time so local dev (no cron) does not break. The cron
  // route enforces presence + length at request time.
  CRON_SECRET: z.string().min(16).optional(),
  // Web Push VAPID keys. Generated via `npx tsx scripts/generate-vapid.ts`.
  // Optional until push is configured; the send pipeline asserts presence.
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_SUBJECT: z
    .string()
    .regex(/^(mailto:|https?:\/\/)/, 'must start with mailto: or https://')
    .optional(),
  // Resend transactional email. Optional until configured; the send pipeline
  // asserts presence and falls back to 'skipped' status when unset.
  RESEND_API_KEY: z.string().min(1).optional(),
  // From address. Use a name + address pair, e.g.
  //   "GeoLeague <no-reply@geoleague.it>".
  EMAIL_FROM: z.string().min(3).optional(),
  // Optional Reply-To. If unset, replies bounce to the From address.
  EMAIL_REPLY_TO: z.string().email().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().url(),
  // Public half of the VAPID keypair. The browser uses this when subscribing.
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
});

const parsedServer = serverSchema.safeParse(process.env);
if (!parsedServer.success) {
  console.error('Invalid server environment variables:', parsedServer.error.flatten().fieldErrors);
  throw new Error('Invalid server environment variables');
}

const parsedClient = clientSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
});
if (!parsedClient.success) {
  console.error('Invalid client environment variables:', parsedClient.error.flatten().fieldErrors);
  throw new Error('Invalid client environment variables');
}

export const env = {
  ...parsedServer.data,
  ...parsedClient.data,
} as const;
