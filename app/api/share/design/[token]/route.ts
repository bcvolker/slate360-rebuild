import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDigitalTwinModelUrl } from "@/lib/digital-twin/resolve-model-url";

// GET /api/share/design/[token] — public, token-gated download of a Design Studio
// export. Redirects to a short-lived presigned URL. No auth required (the token
// is the credential), so anyone with the link can download the file.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("design_exports")
    .select("storage_key, status")
    .eq("share_token", token)
    .single();

  if (!row || row.status !== "ready" || !row.storage_key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const url = await resolveDigitalTwinModelUrl(row.storage_key);
    return NextResponse.redirect(url, 302);
  } catch {
    return NextResponse.json({ error: "Failed to resolve file" }, { status: 500 });
  }
}
