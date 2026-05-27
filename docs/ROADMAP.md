# GeoLeague — Roadmap

Post-validation backlog. The current build (steps 1–16 + 18) is feature-complete enough for a private beta. Everything below is deferred until the product is validated with real users.

---

## Pre-launch (still needed before going live)

These are NOT post-launch — they are launch blockers, just not feature blockers.

- [ ] **Rotate leaked credentials** carried over from early development:
  - Supabase URL + anon + service-role JWTs
  - Cloudflare R2 account ID + access key + secret + bucket name + public URL
  - Google Maps API key (used by `scripts/fetch-streetview.ts`)
- [ ] **Vercel deploy** — connect GitHub, set every env var from [`USAGE.md` §2](./USAGE.md#2-environment-variables) in Production + Preview.
- [ ] **DNS + custom domain** — `geoleague.it` to Vercel, `cdn.geoleague.it` to R2.
- [ ] **Resend domain verify** — add `geoleague.it` to Resend, set SPF/DKIM records, wait for verification, set `EMAIL_FROM`.
- [ ] **VAPID keys generated** (`npm run vapid:generate`) and set as Vercel env vars (all four).
- [ ] **`CRON_SECRET` set** in Vercel (32+ hex chars, generated via `openssl rand -hex 32`).
- [ ] **Schedule the first real challenge** via `/admin/challenges/new` (see [`USAGE.md` §3.2](./USAGE.md#32-schedule-a-new-daily-challenge)).
- [ ] Smoke-test the live cron with a manual curl hit.

---

## Step 17 — Cron last-call (T-30 minute reminder)

Push + email reminder to users who haven't played, sent ~30 min before `window_closes_at`.

**Scope**
- New cron route `src/app/api/cron/last-call/route.ts` (Node runtime, `dynamic = 'force-dynamic'`, Bearer auth).
- Cron entry in `vercel.json` (every 5 min on Pro plan, every 15 min on Hobby — accept loss of precision on Hobby).
- Query: challenges whose `window_closes_at` falls within `now() + 25m` and `now() + 35m`.
- For each, dispatch push + email to users with no `plays` row for that challenge.
- Use the existing `lastCallEmail()` template in `src/lib/email-templates.ts`.
- Idempotency via the `(challenge_id, user_id, channel, kind='last_call')` UNIQUE constraint (already in the migration).

**Tests**
- Window math edges (24h boundary, DST shift).
- Per-user exclusion when a `plays` row exists.

---

## Step 19 — Stripe Pro subscription

Monthly Pro plan, €3.50 (VAT inclusive), unlocks streak freezes, detailed result stats, and removes the ad slot.

**Scope**
- Stripe dashboard: product + monthly recurring price (€3.50, EUR, taxes inclusive). Enable Stripe Tax for EU VAT.
- `src/lib/stripe.ts` — singleton client + price-id constant.
- Routes:
  - `src/app/api/stripe/checkout/route.ts` — create a Checkout Session, redirect.
  - `src/app/api/stripe/portal/route.ts` — Billing Portal session for cancellation/payment-method updates.
  - `src/app/api/stripe/webhook/route.ts` — handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Update `profiles.is_pro`, `stripe_customer_id`, `stripe_subscription_id`, `pro_until`.
- UI:
  - `src/app/settings/billing/page.tsx` — current plan, upgrade CTA, link to portal.
  - `src/components/ProGate.tsx` (already referenced in plan) — wrap Pro-only result sections.
- Env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`. Update `.env.example` and `src/lib/env.ts`.

**Tests**
- Webhook signature verification.
- Idempotent handling of duplicate webhooks.
- Grace period: `pro_until > now()` keeps Pro features active after cancellation until period end.

---

## Step 20 — Streak counter + freezes (depends on Stripe)

Streak math is already maintained in `apply_play_to_leaderboards` (the trigger updates `profiles.streak_count`, `longest_streak`, `last_played_on`). Step 20 adds the **freeze** perk for Pro users.

**Scope**
- Migration: `streak_freezes` table (already specified in `IMPLEMENTATION.md` archive, not yet created):
  - `id`, `user_id`, `granted_for_month` (1st of month, UNIQUE per user/month), `used_on`, FK on profiles.
- Cron or webhook (Stripe `invoice.paid`): grant one freeze on the 1st of each month to Pro users.
- Modify the streak trigger to consume a freeze when exactly one day is missed.
- Show remaining freezes in the profile stats grid.
- Italian copy keys.

**Tests**
- Skip 1 day → streak preserved, freeze consumed.
- Skip 2+ days → streak resets, no freeze consumed.
- Non-Pro user: no freezes ever granted.

---

## Step 21 — Ad slot stub

Free-tier-only banner placeholder on the result page.

**Scope**
- `src/components/AdSlot.tsx` — visually distinct placeholder, IT copy "Pubblicità" + CTA "Rimuovi con Pro".
- Render in `/result/[playId]` only when `!profile.is_pro`.
- No real ad provider in v1 — just reserved space. Wire to AdSense or alternative once revenue justifies.

---

## Step 22 — PWA install prompt + iOS push instructions

iOS Safari only delivers Web Push to *installed* PWAs. Without an install prompt, push will not work for iOS users at all.

**Scope**
- `beforeinstallprompt` capture + custom CTA on Android/Desktop.
- iOS-detection branch with explicit "Aggiungi alla schermata Home" instructions (Apple offers no programmatic prompt).
- Polish manifest icons (real branded SVG + raster sizes 192/512/maskable). Currently only a placeholder `icon.svg` exists.
- Show the prompt only after a successful play (high engagement moment), not on first visit.

---

## Step 23 — Italian copy + a11y + mobile QA pass

Final pass before launch. Should be done with real devices in hand.

**Scope**
- Audit every `t['...']` key — native-speaker review.
- A11y:
  - Keyboard navigation through the play loop (PanoViewer, GuessMap submit).
  - Focus rings + ARIA labels where missing.
  - Contrast ratios (Tailwind defaults are generally fine; verify on neutral-500 against white).
- Mobile QA on at least:
  - iOS Safari (latest + previous major).
  - Android Chrome (latest).
- Specific risk areas:
  - PanoViewer drag on iOS — touch event handling.
  - GuessMap pin placement on small screens.
  - Countdown clock skew vs server time on cold device wake.
  - Leaflet container sizing inside flex/grid parents.

---

## Future ideas (not yet planned)

- Per-region leaderboards (`region` column already on `challenges`).
- Difficulty filter on the history map.
- Friends / private leaderboards.
- Multi-language (English at minimum).
- Replay mode for past challenges (free; doesn't affect leaderboard).
- Cosmetic perks for Pro users (avatar frames, etc.).
