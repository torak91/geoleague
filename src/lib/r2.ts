import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/lib/env';
import { HEADINGS, headingKey, type Heading } from '@/lib/headings';

export { HEADINGS, headingKey, type Heading };

const PRESIGN_EXPIRES_SECONDS = 5 * 60;

let cached: S3Client | null = null;

function getClient(): S3Client {
  if (cached) return cached;
  cached = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  return cached;
}

export function imageKey(prefix: string, heading: Heading): string {
  return `${prefix}/${headingKey(heading)}.jpg`;
}

export function imagePublicUrl(prefix: string, heading: Heading): string {
  return `${env.NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/$/, '')}/${imageKey(prefix, heading)}`;
}

export async function presignPutForHeading(prefix: string, heading: Heading): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: imageKey(prefix, heading),
    ContentType: 'image/jpeg',
  });
  return getSignedUrl(getClient(), command, { expiresIn: PRESIGN_EXPIRES_SECONDS });
}

export async function presignAllHeadings(prefix: string): Promise<Record<Heading, string>> {
  const entries = await Promise.all(
    HEADINGS.map(async (h) => [h, await presignPutForHeading(prefix, h)] as const),
  );
  return Object.fromEntries(entries) as Record<Heading, string>;
}

export async function deleteImagePrefix(prefix: string): Promise<void> {
  const client = getClient();
  await Promise.all(
    HEADINGS.map((h) =>
      client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: imageKey(prefix, h) })),
    ),
  );
}
