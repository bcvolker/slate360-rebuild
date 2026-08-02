import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { resolveTwinShareModel } from "@/lib/digital-twin/share-model";
import { resolveTwinCamerasKey } from "@/lib/digital-twin/resolve-twin-cameras-key";
import { createTwinShareRateLimiter } from "@/lib/digital-twin/share-rate-limit";
import { BUCKET, s3 } from "@/lib/s3";

export const runtime = "nodejs";

const checkRate = createTwinShareRateLimiter("twin-share:cameras", 30, 60);

type Params = { params: Promise<{ token: string }> };

/**
 * Photo Explorer cameras.json for a SHARED twin. Resolves the published/primary
 * model from the share token, derives the cameras.json R2 key from
 * qualityMetrics.derivativeKeys (falling back to the model-key suffix), and
 * streams the sidecar. 404 (not a denial) when absent so the viewer simply
 * hides the photo layer.
 */
export async function GET(req: NextRequest, ctx: Params) {
  const { token } = await ctx.params;
  const blocked = await checkRate(req, token);
  if (blocked) return blocked;

  const result = await resolveTwinShareModel(token);
  if (!result.ok) return NextResponse.json(null, { status: 404 });

  const { storage_key, quality_metrics } = result.model;
  const key = resolveTwinCamerasKey(storage_key, quality_metrics);
  if (!key) return NextResponse.json(null, { status: 404 });

  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = await res.Body?.transformToString();
    if (!body) return NextResponse.json(null, { status: 404 });
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json(null, { status: 404 });
  }
}
