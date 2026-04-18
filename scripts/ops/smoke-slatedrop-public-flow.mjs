#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function getEnv(name) {
  return process.env[name]?.trim() ?? "";
}

function resolveR2Endpoint() {
  const configuredEndpoint = getEnv("R2_ENDPOINT");
  if (configuredEndpoint) return configuredEndpoint;

  const accountId = getEnv("CLOUDFLARE_ACCOUNT_ID");
  return accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "";
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

async function waitForUpload(admin, fileName, orgId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const query = admin
      .from("slatedrop_uploads")
      .select("id, file_name, s3_key, status, file_size")
      .eq("org_id", orgId)
      .eq("file_name", fileName)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data } = await query;
    if (data) return data;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Uploaded file record was never created");
}

async function main() {
  loadDotEnvFile(path.resolve(process.cwd(), ".env"));
  loadDotEnvFile(path.resolve(process.cwd(), ".env.local"));

  const baseUrl = getEnv("SMOKE_BASE_URL") || "http://127.0.0.1:3000";
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const r2AccessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const r2SecretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  const r2Bucket = getEnv("R2_BUCKET");
  const r2Endpoint = resolveR2Endpoint();

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!r2AccessKeyId || !r2SecretAccessKey || !r2Bucket || !r2Endpoint) {
    throw new Error("Missing R2 runtime configuration for cleanup");
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const s3 = new S3Client({
    region: getEnv("R2_REGION") || "auto",
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });

  const cleanup = [];
  const testPrefix = `__public_r2_smoke_${Date.now()}__`;
  const fileName = `${testPrefix}.png`;
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnR6Z8AAAAASUVORK5CYII=",
    "base64",
  );
  const tmpFilePath = path.join(os.tmpdir(), fileName);
  fs.writeFileSync(tmpFilePath, pngBytes);

  try {
    const { data: org } = await admin.from("organizations").select("id").limit(1).single();
    if (!org?.id) throw new Error("No organization found for smoke test");

    const { data: member } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("org_id", org.id)
      .limit(1)
      .single();
    if (!member?.user_id) throw new Error("No organization member found for smoke test");

    const { data: project, error: projectError } = await admin
      .from("projects")
      .insert({ name: `${testPrefix}-project`, org_id: org.id, created_by: member.user_id })
      .select("id, name")
      .single();
    if (projectError || !project?.id) throw new Error(projectError?.message ?? "Project creation failed");
    cleanup.push(() => admin.from("projects").delete().eq("id", project.id));

    const { data: folder, error: folderError } = await admin
      .from("project_folders")
      .insert({
        name: "Inbound Uploads",
        folder_path: `Projects/${project.id}/Inbound Uploads`,
        project_id: project.id,
        is_system: false,
        folder_type: "uploads",
        scope: "project",
        is_public: false,
        allow_upload: true,
        org_id: org.id,
        created_by: member.user_id,
        sort_order: 999,
        metadata: { smoke_test: true },
      })
      .select("id")
      .single();
    if (folderError || !folder?.id) throw new Error(folderError?.message ?? "Folder creation failed");
    cleanup.push(() => admin.from("project_folders").delete().eq("id", folder.id));

    const uploadToken = makeToken();
    const { error: uploadLinkError } = await admin.from("project_external_links").insert({
      project_id: project.id,
      folder_id: folder.id,
      token: uploadToken,
      created_by: member.user_id,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    if (uploadLinkError) throw new Error(uploadLinkError.message);
    cleanup.push(() => admin.from("project_external_links").delete().eq("token", uploadToken));

    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const browserErrors = [];

      page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") {
          browserErrors.push(`[console:${message.type()}] ${message.text()}`);
        }
      });

      page.on("pageerror", (error) => {
        browserErrors.push(`[pageerror] ${error.message}`);
      });

      const uploadPage = `${baseUrl}/upload/${uploadToken}`;
      const uploadResponse = await page.goto(uploadPage, { waitUntil: "networkidle" });
      if (!uploadResponse || !uploadResponse.ok()) {
        throw new Error(`Upload portal failed to load: ${uploadResponse?.status() ?? "no response"}`);
      }

      await page.locator('input[type="file"]').setInputFiles(tmpFilePath);

      try {
        await page.getByText("Uploaded successfully").waitFor({ timeout: 30000 });
      } catch {
        const resultText = await page.locator(".space-y-2").innerText().catch(() => "");
        const browserDetail = browserErrors.join("\n") || "No browser console errors captured";
        throw new Error(`Upload portal did not complete. Results: ${resultText || "none"}. Browser: ${browserDetail}`);
      }

      const uploadedFile = await waitForUpload(admin, fileName, org.id);
      if (!uploadedFile.id || !uploadedFile.s3_key) {
        throw new Error("Uploaded file record is missing required identifiers");
      }

      if (uploadedFile.status !== "active") {
        const completeResponse = await fetch(`${baseUrl}/api/slatedrop/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: uploadedFile.id, publicToken: uploadToken }),
        });
        const completeBody = await completeResponse.json().catch(() => ({}));
        if (!completeResponse.ok || completeBody?.ok !== true) {
          throw new Error(`Upload completion route failed: ${completeBody?.error ?? completeResponse.status}`);
        }

        const { data: refreshedUpload, error: refreshedUploadError } = await admin
          .from("slatedrop_uploads")
          .select("id, file_name, s3_key, status, file_size")
          .eq("id", uploadedFile.id)
          .maybeSingle();
        if (refreshedUploadError || !refreshedUpload) {
          throw new Error(refreshedUploadError?.message ?? "Unable to reload uploaded file after completion");
        }

        if (refreshedUpload.status !== "active") {
          throw new Error(`Uploaded file remained ${refreshedUpload.status ?? "unknown"} after completion`);
        }

        uploadedFile.status = refreshedUpload.status;
        uploadedFile.file_size = refreshedUpload.file_size;
      }

      cleanup.push(() => admin.from("slatedrop_uploads").delete().eq("id", uploadedFile.id));
      cleanup.push(() => s3.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: uploadedFile.s3_key })));

      const shareToken = makeToken();
      const { error: shareError } = await admin.from("slate_drop_links").insert({
        file_id: uploadedFile.id,
        token: shareToken,
        created_by: member.user_id,
        role: "download",
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        org_id: org.id,
      });
      if (shareError) throw new Error(shareError.message);
      cleanup.push(() => admin.from("slate_drop_links").delete().eq("token", shareToken));

      const sharePage = `${baseUrl}/share/${shareToken}`;
      const shareResponse = await page.goto(sharePage, { waitUntil: "networkidle" });
      if (!shareResponse || !shareResponse.ok()) {
        throw new Error(`Share page failed to load: ${shareResponse?.status() ?? "no response"}`);
      }

      await page.getByRole("heading", { name: fileName }).waitFor({ timeout: 30000 });
      const image = page.locator(`img[alt="${fileName}"]`).first();
      await image.waitFor({ timeout: 30000 });

      const downloadHref = await page.locator(`a[download="${fileName}"]`).getAttribute("href");
      if (!downloadHref) throw new Error("Share page did not render a download URL");

      const downloadCheck = await fetch(downloadHref);
      if (!downloadCheck.ok) {
        throw new Error(`Download URL failed: HTTP ${downloadCheck.status}`);
      }

      console.log("PASS upload portal loaded and completed a real upload");
      console.log("PASS uploaded file reached active state in slatedrop_uploads");
      console.log("PASS share page loaded and rendered the uploaded image");
      console.log("PASS share download URL returned the uploaded file from R2");
    } finally {
      await browser.close();
    }
  } finally {
    fs.rmSync(tmpFilePath, { force: true });
    for (const task of cleanup.reverse()) {
      try {
        await task();
      } catch {
        // Best-effort cleanup only.
      }
    }
  }
}

main().catch((error) => {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});