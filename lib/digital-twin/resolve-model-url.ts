import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";

const PUBLIC_KEY_RE = /^https?:\/\//i;

/** Resolves a model storage key to a fetchable URL (public passthrough or presigned R2/S3). */
export async function resolveDigitalTwinModelUrl(storageKey: string): Promise<string> {
  const key = storageKey.trim();
  if (!key) throw new Error("Missing model storage key");
  if (PUBLIC_KEY_RE.test(key)) return key;

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
