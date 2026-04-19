import { S3Client } from "@aws-sdk/client-s3";

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function resolveR2Endpoint(): string {
  const configuredEndpoint = readEnv("R2_ENDPOINT");
  if (configuredEndpoint) return configuredEndpoint;

  const accountId = readEnv("CLOUDFLARE_ACCOUNT_ID");
  return accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "";
}

const r2Config = {
  accessKeyId: readEnv("R2_ACCESS_KEY_ID"),
  secretAccessKey: readEnv("R2_SECRET_ACCESS_KEY"),
  endpoint: resolveR2Endpoint(),
  bucket: readEnv("R2_BUCKET"),
  region: readEnv("R2_REGION") || "auto",
};

const awsConfig = {
  accessKeyId: readEnv("AWS_ACCESS_KEY_ID"),
  secretAccessKey: readEnv("AWS_SECRET_ACCESS_KEY"),
  bucket: readEnv("SLATEDROP_S3_BUCKET") || "slate360-storage",
  region: readEnv("AWS_REGION") || "us-east-2",
};

const hasAnyR2Config = Object.values(r2Config).some(Boolean);
const hasFullR2Config = Boolean(
  r2Config.accessKeyId && r2Config.secretAccessKey && r2Config.endpoint && r2Config.bucket,
);

const hasFullAwsConfig = Boolean(awsConfig.accessKeyId && awsConfig.secretAccessKey && awsConfig.region);

if (hasAnyR2Config && !hasFullR2Config) {
  console.warn("[S3] Partial R2 configuration detected — falling back to AWS S3 settings.");
}

if (!hasFullR2Config && !hasFullAwsConfig) {
  console.warn("[S3] Missing storage credentials — S3/R2 operations will fail.");
}

export const STORAGE_PROVIDER = hasFullR2Config ? "r2" : "aws";
export const BUCKET = hasFullR2Config ? r2Config.bucket : awsConfig.bucket;

export const s3 = new S3Client({
  region: hasFullR2Config ? r2Config.region : awsConfig.region,
  endpoint: hasFullR2Config ? r2Config.endpoint : undefined,
  forcePathStyle: readEnv("S3_FORCE_PATH_STYLE") === "true",
  credentials: {
    accessKeyId: hasFullR2Config ? r2Config.accessKeyId : awsConfig.accessKeyId,
    secretAccessKey: hasFullR2Config ? r2Config.secretAccessKey : awsConfig.secretAccessKey,
  },
});

/** Build the canonical S3 key for a file: orgId/folderId/filename */
export function buildS3Key(orgId: string, folderId: string, filename: string): string {
  // Sanitize filename to avoid path traversal
  const safe = filename.replace(/[^a-zA-Z0-9._\-() ]/g, "_");
  return `orgs/${orgId}/${folderId}/${Date.now()}_${safe}`;
}
