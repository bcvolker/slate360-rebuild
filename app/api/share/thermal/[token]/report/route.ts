import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  claimThermalShareView,
  getLatestThermalReportForSession,
  getThermalSharePasswordHash,
  resolveThermalShareToken,
} from "@/lib/thermal/share-token";
import { shareUnlockCookieName, verifyShareUnlockProof } from "@/lib/thermal/share-password";
import { s3, BUCKET } from "@/lib/s3";

type Params = { params: Promise<{ token: string }> };

async function isShareUnlocked(token: string, requiresPassword: boolean): Promise<boolean> {
  if (!requiresPassword) return true;
  const storedHash = await getThermalSharePasswordHash(token);
  if (!storedHash) return true;
  const cookieStore = await cookies();
  const unlockCookie = cookieStore.get(shareUnlockCookieName(token))?.value;
  if (!unlockCookie) return false;
  return verifyShareUnlockProof(token, storedHash, unlockCookie);
}

export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const gate = await resolveThermalShareToken(token);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }
  if (gate.role !== "download") {
    return NextResponse.json({ error: "Download not permitted for this link" }, { status: 403 });
  }
  if (!(await isShareUnlocked(token, gate.requiresPassword))) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }

  const hdrs = req.headers;
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = hdrs.get("user-agent") ?? "unknown";
  const claimed = await claimThermalShareView(token, ip, ua);
  if (!claimed?.session_id) {
    return NextResponse.json({ error: "Share unavailable" }, { status: 404 });
  }

  const report = await getLatestThermalReportForSession(claimed.session_id as string);
  if (!report?.storage_key) {
    return NextResponse.json({ error: "No report generated yet" }, { status: 404 });
  }

  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: report.storage_key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(report.title || "thermal-report")}.pdf"`,
    }),
    { expiresIn: 900 },
  );

  return NextResponse.redirect(signedUrl);
}
