# GeoLeague

La sfida quotidiana di geo-guessing italiana. One Italian Street-View location per day, 2-hour play window, live weekly + monthly leaderboards.

## Quickstart

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
# Fill in at minimum: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#                    SUPABASE_SERVICE_ROLE_KEY, R2_* + NEXT_PUBLIC_R2_PUBLIC_URL.

# 3. Run local Supabase (optional — or point at hosted)
npm run db:start
npm run db:reset            # applies all migrations + seed
npm run db:types:local      # regenerate database.types.ts

# 4. Dev server
npm run dev                 # http://localhost:3000
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm run start` | Production build + serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint via `next lint` |
| `npm test` | Vitest one-shot (37 tests) |
| `npm run format` | Prettier write |
| `npm run db:start` / `db:stop` / `db:reset` | Local Supabase via `supabase` CLI |
| `npm run db:types` | Regenerate types against linked remote DB |
| `npm run db:types:local` | Regenerate types against local DB |
| `npm run vapid:generate` | Print a fresh VAPID keypair |
| `npm run fetch:streetview -- <args>` | Local helper, see `scripts/fetch-streetview.ts` |

## Documentation

- [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) — what is built, how, with which tools
- [`docs/USAGE.md`](docs/USAGE.md) — daily admin workflows, env setup, deployment
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — post-launch backlog (Stripe, streaks, ads, QA, …)

## Stack

Next.js 14 (App Router) · TypeScript strict · Tailwind · Supabase (Postgres + Auth + RLS + Realtime) · Cloudflare R2 · Leaflet (`react-leaflet`) · framer-motion · web-push · Resend · Stripe (planned) · Vitest · Vercel (deploy + cron).
