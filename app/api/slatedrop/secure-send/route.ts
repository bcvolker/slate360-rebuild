/**
 * POST /api/slatedrop/secure-send
 * Creates a time-limited share token for a file and returns the share URL.
 * Body: { fileId, email?, phone?, permission, expiryDays }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "node:crypto";
import { sendSecureSendEmail } from "@/lib/email";
import { sendSms, isValidPhone } from "@/lib/sms";
import { ensureUnifiedFileForUpload } from "@/lib/slatedrop/unified-files";
import { hashSharePassword } from "@/lib/slatedrop/share-password";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const {
    fileId,
    email,
    phone,
    permission = "view",
    expiryDays = 7,
    password,
  } = await req.json() as {
    fileId: string;
    email?: string;
    phone?: string;
    permission?: "view" | "download";
    expiryDays?: number;
    password?: string;
  };

  const trimmedPassword = typeof password === "string" ? password.trim() : "";

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }
  // email/phone are optional: with neither, this just mints a public share link
  // (the token IS the access) and returns the URL for the caller to copy.
  if (phone && !isValidPhone(phone)) {
    return NextResponse.json(
      { error: "Enter the phone number in international format, e.g. +13105551234." },
      { status: 400 },
    );
  }

  let orgId: string | null = null;
  try {
    const { data } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    orgId = data?.org_id ?? null;
  } catch {
    // solo user fallback
  }

  // Verify the file belongs to this org or user (slatedrop_uploads)
  let fileQuery = admin
    .from("slatedrop_uploads")
    .select("id, file_name, s3_key, file_type, file_size, org_id, uploaded_by, status, folder_id, created_at, unified_file_id")
    .eq("id", fileId)
    .neq("status", "deleted");

  fileQuery = orgId ? fileQuery.eq("org_id", orgId) : fileQuery.eq("uploaded_by", user.id);
  const { data: file, error: fileErr } = await fileQuery.single();

  if (fileErr || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  let unifiedFileId: string;

  try {
    const unifiedFile = await ensureUnifiedFileForUpload(admin, file);
    unifiedFileId = unifiedFile.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to bridge shared file metadata";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertErr } = await admin.from("slate_drop_links").insert({
    file_id: unifiedFileId,
    token,
    created_by: user.id,
    role: permission,      // slate_drop_links uses 'role' instead of 'permission'
    expires_at: expiresAt,
    org_id: orgId,
    ...(trimmedPassword ? { password_hash: hashSharePassword(trimmedPassword) } : {}),
    // shared_with_email is not a column in slate_drop_links — sent via email only
  });

  if (insertErr) {
    // Non-fatal — still return the share URL
    console.warn("[slatedrop/secure-send] insert failed:", insertErr.message);
  }

  const origin = req.nextUrl.origin;
  const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;
  const shareUrl = `${publicBaseUrl}/share/${token}`;

  const senderName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "A Slate360 user";

  let emailSent = false;
  if (email) {
    try {
      await sendSecureSendEmail({
        to: email,
        senderName,
        fileName: file.file_name,
        shareUrl,
        permission,
        expiresAt,
      });
      emailSent = true;
    } catch (err) {
      console.error("[slatedrop/secure-send] Email dispatch failed:", err);
      return NextResponse.json(
        { error: "Failed to send email. Please check your email provider configuration." },
        { status: 500 }
      );
    }
  }

  // Real SMS dispatch (was previously only an `sms:` URI the client had to open).
  let smsSent = false;
  let smsError: string | null = null;
  if (phone) {
    const accessVerb = permission === "download" ? "view & download" : "view";
    const body = `${senderName} shared "${file.file_name}" with you on Slate360 (${accessVerb}). Open: ${shareUrl}`;
    const result = await sendSms({ to: phone, body });
    if (result.ok) {
      smsSent = true;
    } else {
      smsError =
        result.reason === "missing_config"
          ? "Text messaging isn't configured for this workspace yet."
          : result.reason === "invalid_number"
            ? "That phone number couldn't be reached."
            : "Could not send the text message. Please try again.";
      console.warn("[slatedrop/secure-send] SMS dispatch failed:", result.reason, result.detail);
    }
  }

  return NextResponse.json({ ok: true, shareUrl, token, expiresAt, emailSent, smsSent, smsError, passwordProtected: Boolean(trimmedPassword) });
}
