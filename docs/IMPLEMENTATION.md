# GeoLeague — Implementation Reference

A complete inventory of what is built, with the tools, files, and trade-offs behind each piece. Use this as the source of truth when picking up the codebase after time away.

> Last updated: 2026-05-27. Implementation status: steps 1–16 and 18 done; steps 17, 19, 20, 21–23 are post-launch backlog (see [`ROADMAP.md`](./ROADMAP.md)).

---

## 1. Stack & tools

### Application framework
- **Next.js 14.2** App Router, TypeScript strict, React 18.
- **Tailwind CSS 3.4** + `prettier-plugin-tailwindcss` for class ordering.
- **ESLint** (next/core-web-vitals + prettier) — `npm run lint`.
- **Prettier** — `npm run format`.

### Backend & data
- **Supabase** (Postgres 15 EU region):
  - **Auth** — email/password + PKCE callback.
  - **RLS policies** — all tables locked down; public reads only through curated views.
  - **Realtime** — `postgres_changes` on `leaderboard_entries` for live ranking.
  - **Edge functions / RPCs** — `submit_guess` (SECURITY DEFINER), `apply_play_to_leaderboards` trigger.
  - **CLI** — `supabase` (devDependency) for local DB, migrations, and type generation.
- **Cloudflare R2** — challenge images (8 jpegs per challenge). Accessed via S3-compatible `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.

### Frontend interactive
- **Leaflet 1.9** via **`react-leaflet` 4.2.1** (React 18 compatible).
- **`framer-motion` 11** — animated row reorder on the live leaderboard.

### Notifications
- **`web-push` 3.6** — VAPID, server-side push dispatch + dead-endpoint pruning.
- **`resend` 4** — transactional email sender (launch nudge implemented; last-call queued post-launch).

### Sharing
- **`next/og`** — bundled with Next 14, used for dynamic `ImageResponse` share cards.

### Tooling & tests
- **Vitest 4** + jsdom + `@testing-library/react` for unit + component tests.
- **Zod** — env-variable validation + server-action input parsing.
- **tsx** — script runner (`npx tsx scripts/...`).
- **dotenv** — dev-time env loading (Next handles `.env.local` natively; `dotenv` is for scripts).

### Hosting (planned, not yet deployed)
- **Vercel** — Next.js host, cron triggers (`vercel.json` configured for `publish-challenge`).

---

## 2. Implementation status by step

Steps trace the implementation plan in `docs/ROADMAP.md`. Each line below identifies the primary artefacts.

### Step 1 — Repo + tooling
- `package.json` deps + scripts (typecheck, lint, test, format, db:*, vapid:generate, fetch:streetview).
- `.eslintrc.json`, `.prettierrc`, `.prettierignore`, `tsconfig.json`.
- `src/lib/env.ts` — zod-validated process.env (server + client schemas).
- `tests/env.spec.ts`.

### Step 2 — Supabase init + migration 0001
- `supabase/config.toml`, local CLI wiring.
- `supabase/migrations/20260526100039_init.sql` — `profiles`, `challenges`, `challenge_opens`, `plays`, indexes, extensions (pgcrypto, cube, earthdistance).
- `src/lib/supabase/{server,client,service}.ts` — three Supabase clients (SSR cookie-bound, browser singleton, service role).
- `src/lib/supabase/database.types.ts` — generated.

### Step 3 — Auth wiring
- `middleware.ts` — Supabase session refresh + `last_seen_at` touch + admin gate.
- `src/app/(auth)/{login,signup,reset}/page.tsx` — Italian copy.
- `src/app/(auth)/callback/route.ts` (under `(auth)/`) — PKCE handler.
- `src/lib/auth.ts` — `requireUser`, `requireAdmin`.

### Step 4 — Profile bootstrap + settings
- `supabase/migrations/20260526100951_profile_bootstrap.sql` — `on_auth_user_created()` trigger inserts a row into `public.profiles`.
- `src/app/settings/page.tsx` — display name + notification channel + push opt-in.
- `src/app/actions.ts` — server actions for settings updates.

### Step 5 — R2 + admin upload
- `src/lib/r2.ts` — S3 client, `HEADINGS` array (24 headings × 15° rotation), `imagePublicUrl()`.
- `src/app/api/admin/upload-images/route.ts` — presigned PUT URLs.
- `src/app/admin/layout.tsx` — `is_admin` gate.
- `src/app/admin/page.tsx` — calendar of scheduled challenges.
- `src/app/admin/challenges/new/page.tsx` + form — coords, difficulty, region, 24-image upload.
- `src/app/admin/challenges/[id]/page.tsx` — inspect.
- `scripts/fetch-streetview.ts` — local helper to pull JPEGs from Google Maps Static API.

### Step 6 — Views + RLS
- `supabase/migrations/20260526101849_views.sql`:
  - `active_challenge_public` — id, image_prefix, window_closes_at, scheduled_for, difficulty, region (NO lat/lng).
  - `closed_challenge_public` — adds lat/lng/location_label after the window closes.
  - `profiles_public` — id, display_name, avatar_url, is_pro.
- `supabase/migrations/20260526101850_rls.sql` — direct `challenges` reads denied to anon/authenticated; all other tables locked to own-only or service-role write.

### Step 7 — Pano viewer
- `src/components/Pano/PanoViewer.tsx` — 24 pre-decoded JPEGs (one per 15° heading), drag + arrow-key + on-screen control. Touch-friendly.
- `src/lib/headings.ts` — heading array constant.
- `tests/PanoViewer.spec.tsx`.

### Step 8 — Guess map
- `src/components/Map/GuessMap.tsx` + `GuessMapLoader.tsx` — Leaflet, single draggable pin, Italy default view.
- `src/components/Map/ResultMap.tsx` + `ResultMapLoader.tsx` — post-submit map showing guess + actual.
- Loaders use `next/dynamic` with `ssr: false`.

### Step 9 — Scoring RPC + lib/score.ts
- `supabase/migrations/20260526134509_rpc_submit_guess.sql` — `submit_guess(challenge_id, lat, lng)` SECURITY DEFINER. Validates window + open + uniqueness; computes distance via `earth_distance(ll_to_earth, ll_to_earth)/1000`; bases score on exponential decay; awards speed bonus; applies accuracy multiplier.
- `src/lib/score.ts` — TS mirror of the formula for preview/tests.
- `src/lib/geo.ts` — haversine helper + `formatDistance()`.
- `tests/score.spec.ts` + `tests/geo.spec.ts`.

### Step 10 — Play + result pages
- `src/app/play/[challengeId]/page.tsx` — RSC validates active challenge + no existing play, builds image URLs.
- `src/app/play/[challengeId]/PlayClient.tsx` — orchestrates open + countdown + submit.
- `src/app/play/[challengeId]/actions.ts` — `markOpenedAction`, `submitGuessAction` (Zod-validated, RPC-backed).
- `src/components/Countdown.tsx` — server-time-anchored countdown.
- `src/app/result/[playId]/page.tsx` — score breakdown, ResultMap, weekly rank, share button.

### Step 11 — Leaderboard table + non-realtime pages
- `supabase/migrations/20260526180000_leaderboard.sql`:
  - `leaderboard_entries` (PK: user_id, period_type, period_start).
  - `apply_play_to_leaderboards()` trigger AFTER INSERT on `plays`, computes Europe/Rome Monday + month-start.
  - `leaderboard_view` with `rank() OVER (PARTITION BY period_type, period_start ORDER BY total_score DESC)`.
- `src/lib/leaderboard.ts` — `fetchLeaderboardTop`, `fetchOwnLeaderboardRow`. Centralised cast for generated types.
- `src/lib/time.ts` — `weeklyPeriodStart`, `monthlyPeriodStart`, `romeDateIso`, `romeHourMinute`, `publishProbability`.
- `tests/time.spec.ts` — DST + boundary coverage.
- `src/app/leaderboard/{layout,page}.tsx` + `monthly/page.tsx` — tabs.

### Step 12 — Leaderboard Realtime
- `supabase/migrations/20260526190000_leaderboard_realtime.sql` — `add table public.leaderboard_entries` to `supabase_realtime` publication.
- `src/components/Leaderboard/LeaderboardLive.tsx` — client component, opens `supabase.channel('lb-<type>-<start>')` filtered by `period_type`, debounces 1.2 s, refetches via server action, animates reorder with `motion.div layout` in `AnimatePresence`.

### Step 13 — Profile stats + history map
- `src/app/profile/page.tsx` — 9-stat grid (plays, total/avg/best score, best distance, current+longest streak, weekly+monthly rank).
- `src/app/profile/[userId]/page.tsx` — public profile via `profiles_public`; self-view redirects to `/profile`.
- `src/components/Map/HistoryMap.tsx` + `HistoryMapLoader.tsx` — colour-banded `CircleMarker`s with `Popup`, auto-fit bounds. Joins own plays with `closed_challenge_public` only (active challenges stay hidden).

### Step 14 — Cron publish-challenge
- `src/app/api/cron/publish-challenge/route.ts`:
  - `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`.
  - Bearer auth via `CRON_SECRET`.
  - Window gate via `publishProbability(hour, minute)` (09:00–17:00 Rome, force at 16:30+).
  - Atomic update `update ... is('published_at', null)` for race safety.
- `vercel.json` — `crons: [{ path: '/api/cron/publish-challenge', schedule: '0,30 7-16 * * *' }]` (UTC, route gates Rome).
- `tests/publish.spec.ts` — probability distribution + force-publish floor.

### Step 15 — Web Push pipeline
- `supabase/migrations/20260526200000_notifications.sql` — `notification_subscriptions` (UNIQUE endpoint) + `notification_log` (UNIQUE `(challenge_id, user_id, channel, kind)` for idempotency).
- `src/lib/notifications.ts` — typed helpers (`AnyClient` cast pattern, see §4): `fetchSubscriptionsForUsers`, `delete*`, `touchSubscriptionsLastSeen`, `upsertSubscription`, `fetchAlreadyNotifiedUserIds`, `insertNotificationLogs`, `fetchEmailRecipientUserIds` (added in step 16).
- `src/lib/push.ts` — `sendPushToUsers(userIds, payload)` → `Promise.allSettled`, prunes 404/410, returns `{result, perUser}`.
- `src/app/api/push/{subscribe,unsubscribe}/route.ts` — Zod-validated bodies, upsert by endpoint.
- `src/components/Settings/NotificationOptIn.tsx` — registers `/sw.js`, subscribes via PushManager, sends to `/api/push/subscribe`.
- `public/sw.js` — install/activate/push/notificationclick handlers.
- `public/manifest.webmanifest` + `public/icon.svg`.
- `scripts/generate-vapid.ts`.

### Step 16 — Resend email pipeline
- `src/lib/email-templates.ts` — `launchEmail()` (sent), `lastCallEmail()` (queued — step 17). HTML shell with preheader, escaping, button helper; plain-text fallback.
- `src/lib/email.ts` — `sendEmailToUsers(userIds, template)`. Resolves emails via `svc.auth.admin.listUsers` (paged 1000), per-recipient send with `Promise.allSettled`, matches push shape (`{result, perUser}`). Silently returns `skipped` for everyone when Resend env vars are unset.
- `src/lib/notifications.ts` — `fetchEmailRecipientUserIds(svc, cutoffIso)`: `notification_channel != 'none' AND (channel IN ('email','both') OR last_seen_at < cutoff)`; null `last_seen_at` is NOT treated as stale.
- `src/app/api/cron/publish-challenge/route.ts` — calls `dispatchLaunchEmail(svc, challengeId)` after push, with 3-day staleness cutoff, retry-safe via `fetchAlreadyNotifiedUserIds` + UNIQUE log constraint.
- `src/lib/env.ts` — optional `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`.

### Step 18 — Share card
- `src/app/api/share/[playId]/route.tsx` — `next/og` `ImageResponse` 1200×630. Service-role fetch (UUID acts as access token), branded dark layout, score/date/distance/player; reveals `location_label` only post-window-close. 5-minute cache.
- `src/app/share/[playId]/page.tsx` — public landing with `generateMetadata` (`og:image` + Twitter card pointing at `/api/share/[playId]`), full IT body, "Gioca anche tu" CTA.
- `src/components/Result/ShareButton.tsx` — client. Uses `navigator.share()` if available, else clipboard. Suppresses `AbortError`. IT feedback strings.
- Wired into `src/app/result/[playId]/page.tsx` between back-home and view-leaderboard.

---

## 3. Folder map

```
geoleague/
├── README.md
├── docs/                            <-- this folder
│   ├── IMPLEMENTATION.md
│   ├── USAGE.md
│   └── ROADMAP.md
├── package.json
├── next.config.* / tailwind.config.ts / tsconfig.json / .eslintrc.json / .prettierrc
├── middleware.ts                    <-- Supabase session refresh + admin gate
├── vercel.json                      <-- cron schedule (publish-challenge)
├── public/
│   ├── sw.js                        <-- service worker (push)
│   ├── manifest.webmanifest
│   └── icon.svg
├── scripts/
│   ├── fetch-streetview.ts          <-- local: pull 24 JPEGs from Google Maps Static API
│   └── generate-vapid.ts            <-- one-shot VAPID keypair
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20260526100039_init.sql
│       ├── 20260526100951_profile_bootstrap.sql
│       ├── 20260526101849_views.sql
│       ├── 20260526101850_rls.sql
│       ├── 20260526134509_rpc_submit_guess.sql
│       ├── 20260526180000_leaderboard.sql
│       ├── 20260526190000_leaderboard_realtime.sql
│       └── 20260526200000_notifications.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx               <-- root layout, html lang=it, viewport export
│   │   ├── globals.css
│   │   ├── page.tsx                 <-- home: routes to active challenge / result / empty state
│   │   ├── actions.ts               <-- shared server actions (settings)
│   │   ├── (auth)/{login,signup,reset}/page.tsx
│   │   ├── play/[challengeId]/{page,PlayClient,actions}.tsx
│   │   ├── result/[playId]/page.tsx
│   │   ├── share/[playId]/page.tsx                  <-- step 18
│   │   ├── leaderboard/{page,monthly/page,layout}.tsx
│   │   ├── profile/page.tsx
│   │   ├── profile/[userId]/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── admin/{page,layout}.tsx
│   │   ├── admin/challenges/{new,[id]}/page.tsx
│   │   └── api/
│   │       ├── cron/publish-challenge/route.ts      <-- steps 14 + 15 + 16
│   │       ├── push/{subscribe,unsubscribe}/route.ts
│   │       ├── admin/upload-images/route.ts
│   │       └── share/[playId]/route.tsx             <-- step 18 OG image
│   ├── components/
│   │   ├── Countdown.tsx
│   │   ├── Pano/PanoViewer.tsx
│   │   ├── Map/{GuessMap,GuessMapLoader,ResultMap,ResultMapLoader,HistoryMap,HistoryMapLoader}.tsx
│   │   ├── Leaderboard/LeaderboardLive.tsx
│   │   ├── Settings/NotificationOptIn.tsx
│   │   └── Result/ShareButton.tsx                   <-- step 18
│   ├── lib/
│   │   ├── env.ts                   <-- zod-validated env
│   │   ├── i18n.ts                  <-- flat IT string map
│   │   ├── auth.ts
│   │   ├── geo.ts                   <-- haversine + formatDistance
│   │   ├── score.ts                 <-- TS mirror of submit_guess
│   │   ├── time.ts                  <-- Europe/Rome boundaries, publishProbability
│   │   ├── r2.ts                    <-- S3 client + HEADINGS + imagePublicUrl
│   │   ├── headings.ts
│   │   ├── leaderboard.ts           <-- fetchLeaderboardTop, fetchOwnLeaderboardRow
│   │   ├── notifications.ts        <-- subscription + log + recipient helpers
│   │   ├── push.ts                  <-- web-push dispatcher
│   │   ├── email.ts                 <-- Resend dispatcher
│   │   ├── email-templates.ts       <-- IT launch + last-call templates
│   │   └── supabase/{server,client,service,database.types}.ts
│   └── types/                       <-- (reserved)
└── tests/
    ├── env.spec.ts
    ├── geo.spec.ts
    ├── PanoViewer.spec.tsx
    ├── publish.spec.ts
    ├── score.spec.ts
    └── time.spec.ts
```

---

## 4. Cross-cutting patterns

### `AnyClient` cast (lib helpers vs. generated types)
Generated `database.types.ts` lags behind newly-pushed migrations until `npm run db:types` is re-run. Rather than fight the generic, every lib helper that touches a recently-added table (`leaderboard_entries`, `notification_subscriptions`, `notification_log`) types its `supabase` parameter as:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;
```

This is a deliberate single-point-of-cast pattern. Re-run `db:types`, and we can tighten any individual helper. See `src/lib/leaderboard.ts` and `src/lib/notifications.ts`.

### Italian copy via `src/lib/i18n.ts`
All user-facing strings live in a single flat object keyed by dotted area (`auth.error.invalid_credentials`, `leaderboard.tab_weekly`, …). Type-checked: `import { t } from '@/lib/i18n'; t['result.share']`. Adding a key adds it to the union of `TranslationKey`.

### Server-side scoring
`submit_guess` is the only writer of `plays`. RLS denies direct insert. The TS `lib/score.ts` mirror exists for unit tests + UI preview — never trusted server-side.

### Idempotent notification dispatch
- UNIQUE `(challenge_id, user_id, channel, kind)` on `notification_log` makes retried cron firings safe.
- Before dispatch, `fetchAlreadyNotifiedUserIds(channel, kind)` strips the already-logged subset.
- Push prunes dead endpoints via 404/410.
- Email silently returns `skipped` when `RESEND_API_KEY` or `EMAIL_FROM` are unset — never throws.

### Europe/Rome correctness
All week/month boundaries are computed via `date_trunc('week'/'month', ts AT TIME ZONE 'Europe/Rome')` on the SQL side and an `Intl.DateTimeFormat({ timeZone: 'Europe/Rome' })` helper on the TS side. `tests/time.spec.ts` covers DST + midnight edges.

---

## 5. Data flows (quick recap)

### A. Play loop
1. `/` → if today's `active_challenge_public` exists and user has no `plays` row → redirect `/play/[id]`.
2. `/play/[id]` validates, loads 24 JPEGs, calls `markOpenedAction` after preload.
3. Submit → `submitGuessAction` → RPC `submit_guess` → trigger upserts `leaderboard_entries` + updates streak.
4. Redirect `/result/[playId]` — shows score breakdown, ResultMap (guess + actual), weekly rank, share button.

### B. Daily publish
1. Vercel cron hits `/api/cron/publish-challenge` at `:00` and `:30` between 07:00–16:00 UTC.
2. Route gates on `CRON_SECRET` + `publishProbability(hour, minute)` (Europe/Rome).
3. Picks the unpublished `scheduled_for = today` row, atomic update with `published_at = now()` + `window_closes_at = now() + 2h`.
4. `dispatchLaunchPush` — opt-in users get a push (excluding already-logged).
5. `dispatchLaunchEmail` — email-channel users + stale (>3d) users get an IT email.
6. Idempotent on retry.

### C. Live leaderboard
1. `/leaderboard` SSR fetches top-100 + own rank.
2. `LeaderboardLive` opens a Realtime channel filtered by `period_type`, debounces 1.2 s, refetches via server action.
3. Row reorder animates via `motion.div layout` + `AnimatePresence` (grid layout, not `<table>`).

### D. Share
1. `/result/[playId]` → ShareButton copies/share `${origin}/share/[playId]`.
2. `/share/[playId]` SSR renders public landing + sets OG meta pointing at `/api/share/[playId]`.
3. `/api/share/[playId]` returns dynamic OG image with score + (post-close) location label.

---

## 6. Tests

`npm test` runs 37 tests across 6 files:

| File | What it covers |
| --- | --- |
| `tests/env.spec.ts` | Zod env schema accept/reject |
| `tests/geo.spec.ts` | haversine + `formatDistance` |
| `tests/score.spec.ts` | TS-vs-SQL score parity on fixtures |
| `tests/time.spec.ts` | Europe/Rome week/month boundaries + DST |
| `tests/publish.spec.ts` | `publishProbability` uniform distribution + force-publish floor |
| `tests/PanoViewer.spec.tsx` | PanoViewer rotation control |

All TypeScript checks (`npm run typecheck`) and lint (`npm run lint`) currently pass cleanly.
