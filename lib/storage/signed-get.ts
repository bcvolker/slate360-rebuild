import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { BUCKET, s3 } from "@/lib/s3";

/** Short-lived GET URL so the browser talks to R2/CDN, not a Vercel function body. */
export async function signedGetUrl(
  key: string,
  opts?: { expiresIn?: number; contentType?: string; cacheControl?: string },
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentType: opts?.contentType,
    ResponseCacheControl: opts?.cacheControl ?? "public, max-age=3600",
  });
  return getSignedUrl(s3, command, { expiresIn: opts?.expiresIn ?? 3600 });
}
