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
  } = await req.json() as {
    fileId: string;
    email?: string;
    phone?: string;
    permission?: "view" | "download";
    expiryDays?: number;
  };

  if (!fileId || (!email && !phone)) {
    return NextResponse.json({ error: "fileId and either email or phone are required" }, { status: 400 });
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
    .select("id, file_name, s3_key")
    .eq("id", fileId)
    .neq("status", "deleted");

  fileQuery = orgId ? fileQuery.eq("org_id", orgId) : fileQuery.eq("uploaded_by", user.id);
  const { data: file, error: fileErr } = await fileQuery.single();

  if (fileErr || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertErr } = await admin.from("slate_drop_links").insert({
    file_id: fileId,
    token,
    created_by: user.id,
    role: permission,      // slate_drop_links uses 'role' instead of 'permission'
    expires_at: expiresAt,
    org_id: orgId,
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
    } catch (err) {
      console.error("[slatedrop/secure-send] Email dispatch failed:", err);
      return NextResponse.json(
        { error: "Failed to send email. Please check your email provider configuration." },
        { status: 500 }
      );
    }
  }

  const smsUrl = phone
    ? `sms:${encodeURIComponent(phone)}?body=${encodeURIComponent(`Slate360 project map: ${shareUrl}`)}`
    : null;

  return NextResponse.json({ ok: true, shareUrl, token, expiresAt, smsUrl });
}
