import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { notFound, unauthorized } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { projectInOrg } from "@/lib/spatial-tour/route-guard";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string; markId: string }> };

/** Operator view of one checkpoint still (equirect JPEG), for review before publishing. */
export const GET = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId, markId } = await ctx.params;
    if (!(await projectInOrg(admin, orgId, projectId))) return notFound("Project not found");
    const { data: mark } = await admin
      .from("spatial_checkpoint_marks")
      .select("still_key, walkthrough_id")
      .eq("id", markId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!mark?.still_key) return notFound("Still not ready");
    const { data: walk } = await admin
      .from("spatial_walkthroughs")
      .select("id")
      .eq("id", mark.walkthrough_id)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!walk) return notFound("Still not found");
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: String(mark.still_key) }), { abortSignal: req.signal });
    if (!obj.Body) return notFound("Still not found");
    const headers = new Headers({ "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" });
    if (obj.ContentLength != null) headers.set("Content-Length", String(obj.ContentLength));
    return new NextResponse(obj.Body.transformToWebStream() as ReadableStream, { status: 200, headers });
  }, "author");
