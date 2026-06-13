import { NextRequest, NextResponse } from "next/server";
import { claimThermalShareView, resolveThermalShareToken, getThermalSharePasswordHash } from "@/lib/thermal/share-token";
import { shareUnlockCookieName, verifyShareUnlockProof } from "@/lib/thermal/share-password";
import { cookies } from "next/headers";
import { loadThermalShareViewerData } from "@/lib/thermal/load-share-viewer";
import {
  buildAnomalyCsv,
  buildAnomalyGeoJson,
  buildAnomalyJson,
} from "@/lib/thermal/build-anomaly-export";

type Params = { params: Promise<{ token: string }> };

async function isUnlocked(token: string, requiresPassword: boolean): Promise<boolean> {
  if (!requiresPassword) return true;
  const storedHash = await getThermalSharePasswordHash(token);
  if (!storedHash) return true;
  const cookieStore = await cookies();
  const proof = cookieStore.get(shareUnlockCookieName(token))?.value;
  return !!proof && verifyShareUnlockProof(token, storedHash, proof);
}

export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const gate = await resolveThermalShareToken(token);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }
  if (gate.role !== "download") {
    return NextResponse.json({ error: "Export not permitted for this link" }, { status: 403 });
  }
  if (!(await isUnlocked(token, gate.requiresPassword))) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }

  const claimed = await claimThermalShareView(token, "export", "export");
  if (!claimed?.session_id) {
    return NextResponse.json({ error: "Share unavailable" }, { status: 404 });
  }

  const data = await loadThermalShareViewerData(
    claimed.session_id as string,
    (claimed.branding_snapshot as Record<string, unknown>) ?? {},
    (claimed.layer_config as Record<string, unknown>) ?? {},
  );
  if (!data) {
    return NextResponse.json({ error: "No data" }, { status: 404 });
  }

  const format = (req.nextUrl.searchParams.get("format") || "json").toLowerCase();
  const exportCaptures = data.captures.map((capture) => ({
    id: capture.id,
    filename: capture.filename,
    anomalies: capture.anomalies,
    gpsPosition: capture.gpsPosition ?? {},
  }));

  if (format === "csv") {
    const csv = buildAnomalyCsv(exportCaptures);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="thermal-anomalies-${token}.csv"`,
      },
    });
  }

  if (format === "geojson") {
    return NextResponse.json(buildAnomalyGeoJson(exportCaptures), {
      headers: {
        "Content-Disposition": `attachment; filename="thermal-anomalies-${token}.geojson"`,
      },
    });
  }

  return NextResponse.json(buildAnomalyJson(data.sessionName, exportCaptures), {
    headers: {
      "Content-Disposition": `attachment; filename="thermal-export-${token}.json"`,
    },
  });
}
