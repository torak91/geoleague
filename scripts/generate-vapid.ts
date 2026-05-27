/**
 * One-shot helper: prints a fresh VAPID keypair.
 *
 *   npx tsx scripts/generate-vapid.ts
 *
 * Paste the output into .env.local. Same public key goes into both
 * VAPID_PUBLIC_KEY (server) and NEXT_PUBLIC_VAPID_PUBLIC_KEY (browser).
 * VAPID_SUBJECT must be `mailto:you@example.com` or a site URL.
 */

import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_SUBJECT=mailto:you@example.com`);
