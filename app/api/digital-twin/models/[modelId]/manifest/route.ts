import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withAuth } from "@/lib/server/api-auth";
import { BUCKET, s3 } from "@/lib/s3";

export const runtime = "nodejs";

type Params = { params: Promise<{ modelId: string }> };

/**
 * Orientation/framing manifest for the AUTHENTICATED twin viewer (org-scoped mirror of the share
 * manifest route). The authenticated splat now streams via /api/digital-twin/models/[id]/splat,
 * which has no `.spz` suffix — so the generic ?u= manifest route can't derive the sibling key.
 * This resolves the model's storage key by orgId and streams the baked `<key>.manifest.json` so
 * the in-app model is upright + centered like the share link.
 */
export function GET(req: NextRequest, ctx: Params) {
  return withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return NextResponse.json(null, { status: 404 });
    const { modelId } = await ctx.params;

    const { data: model } = await admin
      .from("digital_twin_models")
      .select("storage_key")
      .eq("id", modelId)
      .eq("org_id", orgId)
      .eq("status", "ready")
      .is("deleted_at", null)
      .maybeSingle();

    const storageKey = model?.storage_key;
    const key =
      storageKey && storageKey.toLowerCase().endsWith(".spz")
        ? `${storageKey.slice(0, -".spz".length)}.manifest.json`
        : null;
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
