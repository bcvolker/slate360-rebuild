import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { unauthorized, notFound } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { assertDerivativeAudioKey } from "@/lib/spatial-walkthrough/audio-store";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const GET = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const assetId = req.nextUrl.searchParams.get("asset");
    if (!assetId) return notFound("asset required");
    const { data: asset } = await admin
      .from("spatial_audio_assets")
      .select("storage_key, mime, walkthrough_id")
      .eq("id", assetId)
      .eq("walkthrough_id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!asset?.storage_key || !assertDerivativeAudioKey(asset.storage_key)) {
      return notFound("audio not permitted");
    }
    const range = req.headers.get("range") ?? undefined;
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: asset.storage_key, Range: range }));
    const headers = new Headers();
    headers.set("Content-Type", asset.mime || "audio/webm");
    headers.set("Accept-Ranges", "bytes");
    if (obj.ContentLength != null) headers.set("Content-Length", String(obj.ContentLength));
    if (obj.ContentRange) headers.set("Content-Range", obj.ContentRange);
    return new NextResponse(obj.Body as never, { status: range && obj.ContentRange ? 206 : 200, headers });
  }, "view");
