import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { resolveTwinShareLidarModel } from "@/lib/digital-twin/share-lidar";
import { resolveLidarDerivativeKey } from "@/lib/digital-twin/lidar-derivative-key";
import { createTwinShareRateLimiter } from "@/lib/digital-twin/share-rate-limit";
import { BUCKET, s3 } from "@/lib/s3";

export const runtime = "nodejs";

const checkRate = createTwinShareRateLimiter("twin-share:lidar", 120, 60);

type Params = { params: Promise<{ token: string; path?: string[] }> };

export async function GET(req: NextRequest, ctx: Params) {
  const { token, path = [] } = await ctx.params;
  const blocked = await checkRate(req, token);
  if (blocked) return blocked;

  const result = await resolveTwinShareLidarModel(
    token,
    new URL(req.url).searchParams.get("modelId"),
  );
  if (!result.ok) return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  const relativePath = path.join("/") || "hierarchy.json";
  const key = resolveLidarDerivativeKey(result.model, relativePath);
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
    const contentType =
      relativePath.endsWith(".json") || relativePath.endsWith(".geojson")
        ? "application/json"
        : "application/octet-stream";
    return new NextResponse(stream as BodyInit, {
      headers: {
        "content-type": object.ContentType ?? contentType,
        "cache-control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "LiDAR asset unavailable" }, { status: 404 });
  }
}
