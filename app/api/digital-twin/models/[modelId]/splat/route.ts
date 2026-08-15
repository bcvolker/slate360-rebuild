import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withAuth } from "@/lib/server/api-auth";
import { badRequest, notFound, serverError } from "@/lib/server/api-response";
import { isBakeFresh, parseBakedExport } from "@/lib/digital-twin/bake-hash";
import { BUCKET, s3 } from "@/lib/s3";

export const runtime = "nodejs";

type Params = { params: Promise<{ modelId: string }> };

type StreamBody = { transformToWebStream?: () => ReadableStream<Uint8Array> };

/**
 * Same-origin splat stream for the AUTHENTICATED twin viewer — the org-scoped mirror of the
 * share route (app/api/share/twin/[token]/splat). The authenticated viewer previously handed the
 * Spark/three.js splat loader a raw CROSS-ORIGIN presigned R2 URL, which fails CORS and throws
 * synchronously into the route error boundary ("Something went wrong" — twins wouldn't open).
 * Streaming through this proxy removes the cross-origin fetch entirely, matching the working
 * share path.
 */
export function GET(req: NextRequest, ctx: Params) {
  return withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { modelId } = await ctx.params;

    const { data: model, error } = await admin
      .from("digital_twin_models")
      .select("storage_key, edit_list, baked_export")
      .eq("id", modelId)
      .eq("org_id", orgId)
      .eq("status", "ready")
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!model?.storage_key) return notFound("Model not found");

    // E1: downloads may request the baked file (?baked=1). The LIVE viewer must
    // keep getting the RAW file — it applies edit_list non-destructively at
    // render time, and serving it a baked file would double-apply the edits.
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
      const object = await s3.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      );
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
        // E1 honesty header: "baked" | "stale" (edits exist, bake outdated) | "none".
        "x-twin-bake": bakeState,
      });
      if (object.ContentLength != null) headers.set("Content-Length", String(object.ContentLength));
      return new NextResponse(stream as ReadableStream<Uint8Array>, { status: 200, headers });
    } catch (err) {
      console.error("[GET /api/digital-twin/models/[modelId]/splat]", err);
      return serverError(err instanceof Error ? err.message : "Model stream failed");
    }
  });
}
