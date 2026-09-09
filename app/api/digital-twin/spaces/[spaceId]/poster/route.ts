/**
 * GET /api/digital-twin/spaces/[spaceId]/poster
 *
 * The twin's thumbnail: the poster photo chosen at upload-complete
 * (lib/twin/capture-summary.ts), resized on the way out so list screens never
 * pull a 12 MP still. 404 when the twin has no photo yet — the client shows the
 * twin-blue placeholder.
 *
 * Query: ?w=640 (default; 160–1600).
 */
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";

import { withAppAuth } from "@/lib/server/api-auth";
import { badRequest, notFound } from "@/lib/server/api-response";
import { BUCKET, s3 } from "@/lib/s3";
import { readPosterRef } from "@/lib/twin/capture-summary";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ spaceId: string }> };

export const GET = (req: NextRequest, ctx: Ctx) =>
  withAppAuth("digital_twin", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { spaceId } = await ctx.params;
    const width = Math.min(1600, Math.max(160, Number(req.nextUrl.searchParams.get("w")) || 640));

    const { data: space } = await admin
      .from("digital_twin_spaces")
      .select("id, settings")
      .eq("id", spaceId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!space) return notFound("Twin not found");
    const poster = readPosterRef(space.settings);
    if (!poster) return notFound("No poster yet");

    const { data: asset } = await admin
      .from("digital_twin_capture_assets")
      .select("storage_key, status")
      .eq("id", poster.assetId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!asset?.storage_key || asset.status !== "ready") return notFound("Poster photo unavailable");

    try {
      const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: asset.storage_key }));
      const bytes = await object.Body?.transformToByteArray();
      if (!bytes) return notFound("Poster photo empty");
      const sharp = (await import("sharp")).default;
      const jpeg = await sharp(Buffer.from(bytes))
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer();
      return new NextResponse(new Uint8Array(jpeg), {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "cache-control": "private, max-age=3600",
        },
      });
    } catch (err) {
      console.error("[spaces/poster]", err instanceof Error ? err.message : err);
      return notFound("Poster photo unavailable");
    }
  });
