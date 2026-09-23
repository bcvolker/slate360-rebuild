/**
 * GET /api/vnext/projects/[projectId]/twin-models/[modelId]/splat — vNext-scoped mirror of
 * /api/digital-twin/models/[modelId]/splat, which the authenticated client Explore Reality viewer
 * streams from same-origin (Spark/three.js can't load a cross-origin presigned R2 URL directly —
 * see the original route's own comment). The legacy route matches the model's org_id against the
 * signed-in user's single org, which misses a project_members collaborator whose access to this
 * project comes from a different org (or no org at all). This route instead authorizes via
 * withProjectAuth, then proves the requested model actually belongs to a twin space under that
 * already-authorized project (digital_twin_models.space_id -> digital_twin_spaces.project_id) —
 * no org check, and no way for a model id from a different project to stream through it.
 */
import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withProjectAuth } from "@/lib/server/api-auth";
import { notFound, serverError } from "@/lib/server/api-response";
import { isBakeFresh, parseBakedExport } from "@/lib/digital-twin/bake-hash";
import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { projectIncludesCapability } from "@/lib/vnext/scope/read-project-scope";
import { clientMayReadSource } from "@/lib/vnext/release/source-visible";
import { BUCKET, s3 } from "@/lib/s3";

export const runtime = "nodejs";

type Params = { params: Promise<{ projectId: string; modelId: string }> };
type StreamBody = { transformToWebStream?: () => ReadableStream<Uint8Array> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId, user }) => {
    const { modelId } = await ctx.params;

    const { data: model, error } = await admin
      .from("digital_twin_models")
      .select("storage_key, edit_list, baked_export, space_id, digital_twin_spaces!inner(project_id)")
      .eq("id", modelId)
      .eq("status", "ready")
      .is("deleted_at", null)
      .eq("digital_twin_spaces.project_id", projectId)
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!model?.storage_key) return notFound("Model not found");
    const kind = resolveTwinViewerKind("", model.storage_key);
    const capability = kind === "model" ? "geometry" : kind === "splat" ? "reality" : null;
    if (!capability || !(await projectIncludesCapability(admin, projectId, capability))) return notFound();
    if (!(await clientMayReadSource(admin, projectId, capability === "geometry" ? "geometry" : "reality", modelId, user.email))) return notFound();

    let key = model.storage_key;
    let bakeState: "baked" | "stale" | "none" = "none";
    if (req.nextUrl.searchParams.get("baked") === "1") {
      if (isBakeFresh(model.baked_export, model.edit_list)) {
        key = parseBakedExport(model.baked_export)!.bakedKey!;
        bakeState = "baked";
      } else if (Array.isArray(model.edit_list) && model.edit_list.length > 0) {
        bakeState = "stale";
      }
    }

    try {
      const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      const body = object.Body as StreamBody | Blob | ReadableStream<Uint8Array> | undefined;
      let stream: ReadableStream<Uint8Array> | Blob | null = null;
      if (body && typeof (body as StreamBody).transformToWebStream === "function") {
        stream = (body as StreamBody).transformToWebStream!();
      } else if (body instanceof Blob || body instanceof ReadableStream) {
        stream = body;
      }
      if (!stream) return serverError("Unable to stream model asset");

      const headers = new Headers({
        "Content-Type": object.ContentType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=300",
        "Accept-Ranges": "bytes",
        "x-twin-bake": bakeState,
      });
      if (object.ContentLength != null) headers.set("Content-Length", String(object.ContentLength));
      return new NextResponse(stream as ReadableStream<Uint8Array>, { status: 200, headers });
    } catch (err) {
      console.error("[GET /api/vnext/projects/[projectId]/twin-models/[modelId]/splat]", err);
      return serverError(err instanceof Error ? err.message : "Model stream failed");
    }
  });
}
