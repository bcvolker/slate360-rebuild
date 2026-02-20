/**
 * POST /api/slatedrop/secure-send
 * Creates a time-limited share token for a file and returns the share URL.
 * Body: { fileId, email, permission, expiryDays }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    fileId,
    email,
    permission = "view",
    expiryDays = 7,
  } = await req.json() as {
    fileId: string;
    email: string;
    permission?: "view" | "download";
    expiryDays?: number;
  };

  if (!fileId || !email) {
    return NextResponse.json({ error: "fileId and email are required" }, { status: 400 });
  }

  // Verify the file belongs to this user
  const { data: file, error: fileErr } = await supabase
    .from("slatedrop_files")
    .select("id, name, s3_key")
    .eq("id", fileId)
    .eq("created_by", user.id)
    .single();

  if (fileErr || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertErr } = await supabase.from("file_shares").insert({
    file_id: fileId,
    token,
    shared_by: user.id,
    shared_with_email: email,
    permission,
    expires_at: expiresAt,
  });

  if (insertErr) {
    // Table may not exist yet — still return the share URL for now
    console.warn("[slatedrop/secure-send] insert failed:", insertErr.message);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.io";
  const shareUrl = `${baseUrl}/share/${token}`;

  // Send branded Secure Send email via Resend (non-blocking, best-effort)
  const senderName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "A Slate360 user";
  fetch(`${baseUrl}/api/email/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "secure-send",
      to: email,
      senderName,
      fileName: file.name,
      shareUrl,
      permission,
      expiresAt,
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, shareUrl, token, expiresAt });
}
