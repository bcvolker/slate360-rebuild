#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

async function loadDotEnvFile(path) {
  try {
    const source = await readFile(path, "utf8");
    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) continue;

      const key = line.slice(0, separatorIndex).trim();
      if (!key || process.env[key]) continue;

      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch {
    // Env files are optional in CI and hosted runtimes.
  }
}

function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function resolveR2Endpoint() {
  const configuredEndpoint = getEnv("R2_ENDPOINT");
  if (configuredEndpoint) return configuredEndpoint;

  const accountId = getEnv("CLOUDFLARE_ACCOUNT_ID");
  return accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "";
}

function maskHost(rawUrl) {
  if (!rawUrl) return "n/a";

  try {
    return new URL(rawUrl).host;
  } catch {
    return rawUrl;
  }
}

function buildConfig() {
  const r2Config = {
    accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    endpoint: resolveR2Endpoint(),
    bucket: getEnv("R2_BUCKET"),
    region: getEnv("R2_REGION") || "auto",
  };

  const awsConfig = {
    accessKeyId: getEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY"),
    bucket: getEnv("SLATEDROP_S3_BUCKET") || "slate360-storage",
    region: getEnv("AWS_REGION") || "us-east-2",
  };

  const hasAnyR2 = Object.values(r2Config).some(Boolean);
  const hasFullR2 = Boolean(
    r2Config.accessKeyId && r2Config.secretAccessKey && r2Config.endpoint && r2Config.bucket,
  );
  const hasFullAws = Boolean(awsConfig.accessKeyId && awsConfig.secretAccessKey && awsConfig.region);

  if (hasFullR2) {
    return {
      provider: "r2",
      bucket: r2Config.bucket,
      region: r2Config.region,
      endpoint: r2Config.endpoint,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
      partialR2: false,
    };
  }

  if (hasFullAws) {
    return {
      provider: "aws",
      bucket: awsConfig.bucket,
      region: awsConfig.region,
      endpoint: "",
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
      partialR2: hasAnyR2,
    };
  }

  return {
    provider: "unconfigured",
    bucket: "",
    region: "",
    endpoint: "",
    credentials: null,
    partialR2: hasAnyR2,
  };
}

await loadDotEnvFile(".env");
await loadDotEnvFile(".env.local");

const config = buildConfig();
const shouldWriteProbe = process.argv.includes("--write-probe");
const shouldPresignProbe = process.argv.includes("--presign-probe");

console.log("[check-storage-runtime] Inspecting storage provider configuration");
console.log(`INFO provider=${config.provider}`);
console.log(`INFO bucket=${config.bucket || "missing"}`);
console.log(`INFO region=${config.region || "missing"}`);
console.log(`INFO endpoint=${maskHost(config.endpoint)}`);

if (config.partialR2) {
  console.log("WARN Partial R2 configuration detected. Runtime is not using R2 yet.");
}

if (!config.credentials || !config.bucket) {
  console.log("FAIL No complete storage configuration found. Set either R2_* or AWS_* + SLATEDROP_S3_BUCKET.");
  process.exit(1);
}

const client = new S3Client({
  region: config.region,
  endpoint: config.endpoint || undefined,
  forcePathStyle: getEnv("S3_FORCE_PATH_STYLE") === "true",
  credentials: config.credentials,
});

try {
  const response = await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
  const statusCode = response.$metadata?.httpStatusCode ?? "unknown";
  console.log(`PASS HeadBucket succeeded for ${config.provider} bucket ${config.bucket} (HTTP ${statusCode})`);
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  const statusCode = error?.$metadata?.httpStatusCode ?? "unknown";
  console.log(`FAIL HeadBucket failed for ${config.provider} bucket ${config.bucket} (HTTP ${statusCode}): ${err.name}: ${err.message}`);
  process.exit(1);
}

if (shouldWriteProbe) {
  const probeKey = `diagnostics/copilot-storage-probe-${Date.now()}.txt`;
  const probeBody = Buffer.from(`storage probe ${new Date().toISOString()}\n`, "utf8");

  try {
    const putResponse = await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: probeKey,
        Body: probeBody,
        ContentType: "text/plain",
      }),
    );
    console.log(`PASS PutObject succeeded for ${probeKey} (HTTP ${putResponse.$metadata?.httpStatusCode ?? "unknown"})`);

    const deleteResponse = await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: probeKey,
      }),
    );
    console.log(`PASS DeleteObject succeeded for ${probeKey} (HTTP ${deleteResponse.$metadata?.httpStatusCode ?? "unknown"})`);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const statusCode = error?.$metadata?.httpStatusCode ?? "unknown";
    console.log(`FAIL Write probe failed for ${probeKey} (HTTP ${statusCode}): ${err.name}: ${err.message}`);
    process.exit(1);
  }
}

if (shouldPresignProbe) {
  const probeKey = `diagnostics/copilot-presign-probe-${Date.now()}.txt`;
  const probeBody = `presign probe ${new Date().toISOString()}\n`;

  try {
    const putCommand = new PutObjectCommand({
      Bucket: config.bucket,
      Key: probeKey,
      ContentType: "text/plain",
    });
    const putUrl = await getSignedUrl(client, putCommand, { expiresIn: 300 });
    const putResponse = await fetch(putUrl, {
      method: "PUT",
      headers: { "content-type": "text/plain" },
      body: probeBody,
    });

    if (!putResponse.ok) {
      console.log(`FAIL Presigned PUT failed for ${probeKey} (HTTP ${putResponse.status})`);
      process.exit(1);
    }

    const getUrl = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: probeKey,
        ResponseContentType: "text/plain",
      }),
      { expiresIn: 300 },
    );
    const getResponse = await fetch(getUrl);

    if (!getResponse.ok) {
      console.log(`FAIL Presigned GET failed for ${probeKey} (HTTP ${getResponse.status})`);
      process.exit(1);
    }

    const downloadedBody = await getResponse.text();
    if (downloadedBody !== probeBody) {
      console.log(`FAIL Presigned GET body mismatch for ${probeKey}`);
      process.exit(1);
    }

    console.log(`PASS Presigned PUT/GET succeeded for ${probeKey}`);

    const deleteResponse = await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: probeKey,
      }),
    );
    console.log(`PASS Cleanup delete succeeded for ${probeKey} (HTTP ${deleteResponse.$metadata?.httpStatusCode ?? "unknown"})`);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.log(`FAIL Presign probe failed for ${probeKey}: ${err.name}: ${err.message}`);
    process.exit(1);
  }
}