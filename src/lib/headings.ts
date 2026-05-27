/**
 * Pure constants for the Street View headings. Lives in its own module so
 * client components can import it without pulling in r2.ts (which depends
 * on server-only env vars).
 *
 * 24 headings at 15° steps balances rotation smoothness against fetch cost
 * (~$0.17 per challenge under the Street View Static API free credit).
 */

export const HEADING_STEP_DEG = 15;
export const HEADING_COUNT = 360 / HEADING_STEP_DEG;
export const HEADINGS = Array.from({ length: HEADING_COUNT }, (_, i) => i * HEADING_STEP_DEG);
export type Heading = number;

/** Zero-padded 3-digit string so alphabetical sort matches heading order. */
export function headingKey(h: number): string {
  return h.toString().padStart(3, '0');
}
