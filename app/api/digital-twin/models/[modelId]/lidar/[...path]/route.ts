import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withAuth } from "@/lib/server/api-auth";
import { resolveLidarDerivativeKey } from "@/lib/digital-twin/lidar-derivative-key";
import { BUCKET, s3 } from "@/lib/s3";

export const runtime = "nodejs";

type Params = { params: Promise<{ modelId: string; path?: string[] }> };

export async function GET(req: NextRequest, ctx: Params) {
  return withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { modelId, path = [] } = await ctx.params;
    const { data: model } = await admin
      .from("digital_twin_models")
      .select("storage_key, model_format, quality_metrics")
      .eq("id", modelId)
      .eq("org_id", orgId)
      .eq("model_format", "lidar_octree")
      .eq("status", "ready")
      .is("deleted_at", null)
      .maybeSingle();
    if (!model?.storage_key) return NextResponse.json({ error: "LiDAR model not found" }, { status: 404 });

    const relativePath = path.join("/") || "manifest.json";
    const key = resolveLidarDerivativeKey(model, relativePath);
    if (!key) return NextResponse.json({ error: "Invalid LiDAR asset" }, { status: 404 });
    try {
      const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      const body = object.Body;
      if (!body) return NextResponse.json({ error: "Empty LiDAR asset" }, { status: 404 });
      const stream =
        typeof (body as { transformToWebStream?: () => ReadableStream }).transformToWebStream ===
        "function"
          ? (body as { transformToWebStream: () => ReadableStream }).transformToWebStream()
          : (body as ReadableStream);
      return new NextResponse(stream as BodyInit, {
        headers: {
          "content-type":
            object.ContentType ??
            (relativePath.endsWith(".json") || relativePath.endsWith(".geojson")
              ? "application/json"
              : "application/octet-stream"),
          "cache-control": "private, max-age=300",
        },
      });
    } catch {
      return NextResponse.json({ error: "LiDAR asset unavailable" }, { status: 404 });
    }
  });
}
