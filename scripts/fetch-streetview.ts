/**
 * Local CLI: fetches the 8 Street View images for a given lat/lng and saves
 * them to disk. Run via:
 *
 *   npx tsx scripts/fetch-streetview.ts <lat> <lng> [out_dir]
 *
 * Example:
 *
 *   npx tsx scripts/fetch-streetview.ts 41.9028 12.4964 ./out/roma
 *
 * Requires GOOGLE_MAPS_API_KEY in the environment (.env.local is loaded
 * automatically by `tsx --env-file`-like flag — see below — or by setting
 * the variable in the shell). The key needs the "Street View Static API"
 * enabled in the Google Cloud project.
 *
 * The script first calls the (free) metadata endpoint to verify a panorama
 * exists at the location; if none is found within ~50m the run aborts
 * BEFORE any paid image requests are made.
 *
 * Output: 8 files named 0.jpg, 45.jpg, 90.jpg, …, 315.jpg in the chosen
 * directory. Upload these via /admin/challenges/new.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Load .env.local so the script picks up GOOGLE_MAPS_API_KEY without the
// user having to export it manually each session.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: path.resolve(process.cwd(), '.env.local') });

import { HEADINGS, headingKey } from '../src/lib/headings';

const SIZE = '1280x720'; // 16:9, matches the viewer's aspect ratio
const FOV = 90;
const PITCH = 0;
const RADIUS = 50; // metres, snap to nearest pano

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function parseArgs() {
  const [, , latStr, lngStr, outDir = './streetview-out'] = process.argv;
  if (!latStr || !lngStr) {
    die('Usage: npx tsx scripts/fetch-streetview.ts <lat> <lng> [out_dir]');
  }
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (Number.isNaN(lat) || Number.isNaN(lng)) die('lat/lng must be numbers.');
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) die('lat/lng out of range.');
  return { lat, lng, outDir };
}

type MetadataResponse = {
  status: 'OK' | 'ZERO_RESULTS' | 'NOT_FOUND' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | string;
  pano_id?: string;
  location?: { lat: number; lng: number };
  date?: string;
  copyright?: string;
};

async function checkPanoExists(key: string, lat: number, lng: number): Promise<MetadataResponse> {
  const url = new URL('https://maps.googleapis.com/maps/api/streetview/metadata');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', String(RADIUS));
  url.searchParams.set('key', key);
  const res = await fetch(url);
  if (!res.ok) die(`Metadata HTTP ${res.status}`);
  return (await res.json()) as MetadataResponse;
}

async function fetchImage(key: string, lat: number, lng: number, heading: number): Promise<Buffer> {
  const url = new URL('https://maps.googleapis.com/maps/api/streetview');
  url.searchParams.set('size', SIZE);
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('heading', String(heading));
  url.searchParams.set('fov', String(FOV));
  url.searchParams.set('pitch', String(PITCH));
  url.searchParams.set('radius', String(RADIUS));
  url.searchParams.set('key', key);
  const res = await fetch(url);
  if (!res.ok) die(`Image HTTP ${res.status} for heading ${heading}`);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

async function main() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) die('GOOGLE_MAPS_API_KEY missing. Add it to .env.local.');

  const { lat, lng, outDir } = parseArgs();

  console.log(`Checking Street View pano near ${lat}, ${lng}…`);
  const meta = await checkPanoExists(key, lat, lng);
  if (meta.status !== 'OK') {
    die(`No pano found (status=${meta.status}). Try a different location.`);
  }
  console.log(
    `Found pano: ${meta.pano_id ?? '<no id>'} at ${meta.location?.lat}, ${meta.location?.lng}` +
      (meta.date ? ` (captured ${meta.date})` : '') +
      (meta.copyright ? ` — ${meta.copyright}` : ''),
  );

  await mkdir(outDir, { recursive: true });

  for (const heading of HEADINGS) {
    process.stdout.write(`  heading ${String(heading).padStart(3)}° … `);
    const buf = await fetchImage(key, lat, lng, heading);
    // Zero-padded filename so alphabetical sort = heading order (used by
    // the admin multi-file upload form).
    const file = path.join(outDir, `${headingKey(heading)}.jpg`);
    await writeFile(file, buf);
    console.log(`${buf.length.toLocaleString()} bytes → ${file}`);
  }

  console.log(
    `\nDone. Upload these ${HEADINGS.length} files at /admin/challenges/new.`,
  );
}

main().catch((e) => die(e instanceof Error ? e.message : String(e)));
