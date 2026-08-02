import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withAuth } from "@/lib/server/api-auth";
import { resolveTwinCamerasKey } from "@/lib/digital-twin/resolve-twin-cameras-key";
import { BUCKET, s3 } from "@/lib/s3";

export const runtime = "nodejs";

type Params = { params: Promise<{ modelId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return NextResponse.json(null, { status: 404 });
    const { modelId } = await ctx.params;

    const { data: model } = await admin
      .from("digital_twin_models")
      .select("storage_key, quality_metrics")
      .eq("id", modelId)
      .eq("org_id", orgId)
      .eq("status", "ready")
      .is("deleted_at", null)
      .maybeSingle();

    const key = resolveTwinCamerasKey(
      model?.storage_key,
      (model?.quality_metrics as Record<string, unknown> | null) ?? null,
    );
    if (!key) return NextResponse.json(null, { status: 404 });

    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      const body = await res.Body?.transformToString();
      if (!body) return NextResponse.json(null, { status: 404 });
      return new NextResponse(body, {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "private, max-age=300" },
      });
    } catch {
      return NextResponse.json(null, { status: 404 });
    }
  });
}
