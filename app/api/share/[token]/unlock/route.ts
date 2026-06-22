/**
 * POST /api/share/[token]/unlock
 * Verifies the password for a password-protected SlateDrop share link and, on
 * success, returns a presigned URL + file metadata so the viewer can render.
 *
 * Body: { password }
 */
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createAdminClient } from "@/lib/supabase/admin";
import { s3, BUCKET } from "@/lib/s3";
import { verifySharePassword } from "@/lib/slatedrop/share-password";
import { createRateLimiter } from "@/lib/server/rate-limit";

// Throttle password attempts to blunt brute-forcing a leaked share token's
// password (and token enumeration). Per-IP; no-ops gracefully without Upstash.
const checkRateLimit = createRateLimiter("share:unlock", 10, 60);

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const rateLimited = await checkRateLimit(req);
  if (rateLimited) return rateLimited;

  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };

  const admin = createAdminClient();

  const { data: link, error } = await admin
    .from("slate_drop_links")
    .select("id, file_id, role, expires_at, password_hash")
    .eq("token", token)
    .single();

  if (error || !link) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "This link has expired." }, { status: 410 });
  }

  const passwordHash = (link as { password_hash?: string | null }).password_hash ?? null;
  if (passwordHash && !verifySharePassword((password ?? "").trim(), passwordHash)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  // Resolve file (unified_files first, legacy slatedrop_uploads fallback).
  const { data: unifiedFile } = await admin
    .from("unified_files")
    .select("id, name, mime_type, size_bytes, storage_key, status")
    .eq("id", link.file_id)
    .maybeSingle();

  const { data: legacyFile } = unifiedFile
    ? { data: null }
    : await admin
        .from("slatedrop_uploads")
        .select("id, file_name, file_type, file_size, s3_key")
        .eq("id", link.file_id)
        .neq("status", "deleted")
        .maybeSingle();

  const file = unifiedFile
    ? {
        fileName: unifiedFile.name,
        fileType: (unifiedFile.mime_type ?? "").toLowerCase(),
        fileSize: unifiedFile.size_bytes ?? 0,
        storageKey: unifiedFile.storage_key,
        status: unifiedFile.status ?? "ready",
      }
    : legacyFile
      ? {
          fileName: legacyFile.file_name,
          fileType: (legacyFile.file_type ?? "").toLowerCase(),
          fileSize: legacyFile.file_size ?? 0,
          storageKey: legacyFile.s3_key,
          status: "ready",
        }
      : null;

  if (!file || !file.storageKey || file.status === "archived") {
    return NextResponse.json({ error: "The shared file is no longer available." }, { status: 404 });
  }

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: file.storageKey });
  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return NextResponse.json({
    ok: true,
    fileName: file.fileName,
    fileType: file.fileType,
    fileSize: file.fileSize,
    presignedUrl,
    canDownload: link.role === "download",
  });
}
