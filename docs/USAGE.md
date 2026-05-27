# GeoLeague — Usage Guide

Day-to-day workflows: local dev, environment setup, admin tasks, deploy.

---

## 1. Local development

### 1.1 First-time setup

```bash
git clone <repo>
cd geoleague
npm install
cp .env.example .env.local
```

Fill `.env.local` (see §2 for what each variable means and where to get it).

```bash
# Optional but recommended: run Supabase locally so resets are free.
npm run db:start
npm run db:reset           # applies all migrations + seed
npm run db:types:local     # regenerate src/lib/supabase/database.types.ts

# Boot the app.
npm run dev                # http://localhost:3000
```

### 1.2 Day-to-day commands

```bash
npm run dev                # dev server with Fast Refresh
npm run typecheck          # tsc --noEmit
npm run lint               # next lint
npm test                   # vitest run (one-shot, 37 tests)
npm run test:watch         # vitest watch
npm run format             # prettier --write .
```

### 1.3 Database migrations

```bash
# Create a new migration via the Supabase CLI.
npx supabase migration new <slug>
# Edit the generated SQL file under supabase/migrations/.

# Apply locally.
npm run db:reset           # nukes local DB and re-applies all migrations + seed

# Regenerate TypeScript types after any schema change.
npm run db:types:local     # local DB
npm run db:types           # linked remote (requires `supabase link`)
```

### 1.4 Common pitfalls

- **Stale `.next` cache after structural changes** (e.g. moving exports between files, root-layout edits) → `rm -rf .next && npm run dev`.
- **Types lag behind migrations** → `database.types.ts` doesn't know about a brand new table until you re-run `db:types`. Lib helpers with the `AnyClient` cast pattern intentionally tolerate this. See [`IMPLEMENTATION.md` §4](./IMPLEMENTATION.md#4-cross-cutting-patterns).
- **Leaflet SSR error** — all map components are loaded via `next/dynamic({ ssr: false })`. Don't import `react-leaflet` directly in a server component.

---

## 2. Environment variables

`src/lib/env.ts` is the source of truth — Zod validates everything at boot. The file is grouped server/client; the table below mirrors that.

### 2.1 Required (server)
| Variable | Where to find it | Notes |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API | Server-only. Never expose to the browser. |
| `R2_ACCOUNT_ID` | Cloudflare → R2 → "Account ID" | |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 → "Manage R2 API Tokens" | Scope: object read+write on the bucket. |
| `R2_SECRET_ACCESS_KEY` | (same panel) | |
| `R2_BUCKET` | Bucket name, e.g. `geoleague-prod` | |

### 2.2 Required (client / browser-safe)
| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` in dev, `https://geoleague.it` in prod. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard. |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Cloudflare R2 public bucket URL or your custom CDN domain. |

### 2.3 Optional (features dormant when absent)
| Variable | Required for |
| --- | --- |
| `CRON_SECRET` | `/api/cron/publish-challenge`. Generate via `openssl rand -hex 32`. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push. Generate via `npm run vapid:generate`; `VAPID_SUBJECT` must start with `mailto:` or `https://`. |
| `RESEND_API_KEY` / `EMAIL_FROM` / `EMAIL_REPLY_TO` | Resend transactional email. `EMAIL_FROM` example: `GeoLeague <no-reply@geoleague.it>`. Domain must be verified in Resend before sending. |
| `GOOGLE_MAPS_API_KEY` | `scripts/fetch-streetview.ts` only. Never deployed. |

When optional VAPID/Resend vars are unset, the corresponding dispatcher silently returns `skipped` instead of throwing — useful for local dev.

---

## 3. Admin workflows

### 3.1 Promote a user to admin
There is no admin-management UI by design. Promote manually:

```sql
update public.profiles set is_admin = true where id = '<user-uuid>';
```

Anyone with `is_admin = true` can hit `/admin/*`.

### 3.2 Schedule a new daily challenge

Daily, the admin needs to add a row to `challenges` so the cron has something to publish. Two routes:

**Option A — fully manual via the admin UI (`/admin/challenges/new`)**:
1. Fetch a Street-View location locally:
   ```bash
   GOOGLE_MAPS_API_KEY=... npm run fetch:streetview -- --lat 41.8902 --lng 12.4922 --out ./tmp/colosseo
   ```
   This writes 24 JPEGs (`0.jpg`, `15.jpg`, …, `345.jpg`).
2. Open `http://localhost:3000/admin/challenges/new` while signed in as the admin user.
3. Fill in: `scheduled_for` date, `lat`, `lng`, `location_label` (optional, only shown after window close), `difficulty`, `region`.
4. Upload all 24 JPEGs. The form requests presigned URLs from `/api/admin/upload-images` and PUTs directly to R2.
5. Submit → inserts a `challenges` row with `published_at = null`. The cron picks it up the next time it runs.

**Option B — SQL + manual upload**: insert directly via SQL (`scheduled_for`, `lat`, `lng`, `image_prefix`, `difficulty`, `region`, `location_label`) and upload the JPEGs to `r2://<bucket>/<image_prefix>/{heading}.jpg`. Useful if you script the daily prep.

### 3.3 Publish behaviour

`/api/cron/publish-challenge` runs at `:00` and `:30` between 07:00–16:00 UTC (matches 09:00–18:00 Rome in winter, 08:00–17:00 in summer; the route filters to 09:00–17:00 Rome internally). Each hit:

- Returns `204 no_challenge` if nothing scheduled.
- Skips with random probability — the floor `16:30 Rome` forces publish.
- Atomic update sets `published_at` + `window_closes_at = +2 h`.
- Dispatches push to push/both users.
- Dispatches email to email/both users plus users with `last_seen_at > 3 days` ago.

Cron retries are safe — the `(challenge_id, user_id, channel, kind)` UNIQUE constraint on `notification_log` deduplicates.

### 3.4 Manually publish for testing

```bash
curl -X GET https://yourhost/api/cron/publish-challenge \
  -H "Authorization: Bearer $CRON_SECRET"
```

The route gates on Rome time, so local manual runs outside 09–17 will return `outside_window`. Either patch the time check temporarily or test inside the window.

---

## 4. Deployment (Vercel + Supabase + Cloudflare)

> **Not yet deployed.** The steps below describe the path; tick them off when you launch.

### 4.1 Prep before pushing
- [ ] Verify all leaked credentials from earlier development have been rotated (Supabase JWTs, R2 keys, Google Maps key).
- [ ] Switch to the production Supabase project.
- [ ] Bucket: create `geoleague-prod` in Cloudflare R2 (separate from `-dev`).
- [ ] DNS: point a CNAME to Vercel's `cname.vercel-dns.com`.
- [ ] Resend: add `geoleague.it` as a domain, set the SPF/DKIM records on your DNS, wait for verification.

### 4.2 Vercel
- [ ] Connect the GitHub repo.
- [ ] Set every variable in §2 in Project Settings → Environment Variables (Production + Preview).
- [ ] Confirm `vercel.json` cron entries are present (`/api/cron/publish-challenge`).
- [ ] First deploy.
- [ ] Hit `/api/cron/publish-challenge` with `CRON_SECRET` to validate auth + window gate.

### 4.3 Cloudflare R2
- [ ] Add `cdn.geoleague.it` as a custom domain in front of the R2 bucket.
- [ ] Set `NEXT_PUBLIC_R2_PUBLIC_URL=https://cdn.geoleague.it`.
- [ ] (Optional) Enable Cloudflare cache rules with aggressive TTL on `/<image_prefix>/*`.

### 4.4 Post-deploy smoke test
- [ ] Sign up a fresh user → check `profiles` row created via the trigger.
- [ ] Schedule a challenge dated today + publish via the cron URL.
- [ ] Play through, submit, land on `/result/[playId]`.
- [ ] Check the share image at `/api/share/[playId]` renders.
- [ ] Open `/leaderboard` in two tabs, submit again with another user → observe Realtime reorder.

---

## 5. Operational hygiene

### 5.1 Daily admin checklist
1. Before bedtime (or via a recurring task): schedule tomorrow's challenge through `/admin/challenges/new`.
2. After 16:30 Rome: confirm today's challenge was published (`/admin` calendar should show it as live).
3. Spot-check `/leaderboard` for activity.

### 5.2 Periodic
- Rotate `CRON_SECRET` every quarter.
- Audit `notification_log` for failure spikes.
- Watch R2 egress and Supabase row counts.

### 5.3 If something breaks
- **Cron didn't fire**: check Vercel cron logs + `notification_log` for a row with today's challenge. If absent, the cron hit was either skipped or auth'd 401. Re-fire manually with curl.
- **Push not delivering**: `notification_subscriptions` rows older than ~30 days are likely dead. The dispatcher prunes 404/410 automatically; emails are the fallback.
- **Leaderboard not updating live**: confirm `alter publication supabase_realtime add table public.leaderboard_entries` migration is applied and Realtime is enabled in the Supabase dashboard.
