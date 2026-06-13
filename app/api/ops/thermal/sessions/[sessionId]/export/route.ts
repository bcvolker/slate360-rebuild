import { NextRequest, NextResponse } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import {
  buildAnomalyCsv,
  buildAnomalyGeoJson,
  buildAnomalyJson,
} from "@/lib/thermal/build-anomaly-export";
import { badRequest, notFound } from "@/lib/server/api-response";

type RouteContext = { params: Promise<{ sessionId: string }> };

export const GET = (req: NextRequest, ctx: RouteContext) =>
  withThermalOpsAuth(req, async ({ admin, orgId, req: request }) => {
    const { sessionId } = await ctx.params;
    const format = (request.nextUrl.searchParams.get("format") || "json").toLowerCase();

    let sessionQuery = admin
      .from("thermal_analysis_sessions")
      .select("id, name, org_id")
      .eq("id", sessionId)
      .is("deleted_at", null);

    if (orgId) sessionQuery = sessionQuery.eq("org_id", orgId);

    const { data: session } = await sessionQuery.maybeSingle();
    if (!session) return notFound("Session not found");

    const { data: captures } = await admin
      .from("thermal_captures")
      .select("id, filename, anomalies, gps_position")
      .eq("session_id", sessionId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    const exportCaptures = (captures ?? []).map((row) => ({
      id: row.id,
      filename: row.filename,
      anomalies: row.anomalies ?? [],
      gpsPosition: (row.gps_position as Record<string, unknown>) ?? {},
    }));

    if (format === "csv") {
      const csv = buildAnomalyCsv(exportCaptures);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="thermal-anomalies-${sessionId}.csv"`,
        },
      });
    }

    if (format === "geojson") {
      return NextResponse.json(buildAnomalyGeoJson(exportCaptures), {
        headers: {
          "Content-Disposition": `attachment; filename="thermal-anomalies-${sessionId}.geojson"`,
        },
      });
    }

    if (format === "json") {
      return NextResponse.json(buildAnomalyJson(session.name, exportCaptures), {
        headers: {
          "Content-Disposition": `attachment; filename="thermal-anomalies-${sessionId}.json"`,
        },
      });
    }

    return badRequest("format must be csv, json, or geojson");
  });
