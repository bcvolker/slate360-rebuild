import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.warn("[S3] Missing AWS credentials — S3 operations will fail.");
}

export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

export const BUCKET = process.env.SLATEDROP_S3_BUCKET ?? "slate360-storage";

/** Build the canonical S3 key for a file: orgId/folderId/filename */
export function buildS3Key(orgId: string, folderId: string, filename: string): string {
  // Sanitize filename to avoid path traversal
  const safe = filename.replace(/[^a-zA-Z0-9._\-() ]/g, "_");
  return `orgs/${orgId}/${folderId}/${Date.now()}_${safe}`;
}
