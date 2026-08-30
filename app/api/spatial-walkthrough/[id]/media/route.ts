import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { unauthorized, notFound } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { selectDerivativeKey, type MediaKind } from "@/lib/spatial-walkthrough/derivatives";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const GET = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, access }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const clipId = req.nextUrl.searchParams.get("clip");
    const kind = (req.nextUrl.searchParams.get("kind") ?? "proxy") as MediaKind;
    if (!clipId) return notFound("clip required");
    const policy = req.nextUrl.searchParams.get("policy") === "master" && access.canAuthor ? "master" : "client";
    const allowMaster = policy === "master" && access.canAuthor;
    const { data: clip } = await admin
      .from("spatial_clips")
      .select("proxy_key, poster_key, master_key, walkthrough_id")
      .eq("id", clipId)
      .eq("walkthrough_id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!clip) return notFound("Clip not found");
    const key = selectDerivativeKey(clip, kind, policy, allowMaster);
    if (!key) return notFound("media not permitted");
    const range = req.headers.get("range") ?? undefined;
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: range }));
    const headers = new Headers();
    headers.set("Content-Type", kind === "poster" ? "image/jpeg" : "video/mp4");
    headers.set("Accept-Ranges", "bytes");
    if (obj.ContentLength != null) headers.set("Content-Length", String(obj.ContentLength));
    if (obj.ContentRange) headers.set("Content-Range", obj.ContentRange);
    return new NextResponse(obj.Body as never, { status: range && obj.ContentRange ? 206 : 200, headers });
  }, "view");
