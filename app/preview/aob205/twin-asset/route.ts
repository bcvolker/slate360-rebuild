import type { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound, serverError } from "@/lib/server/api-response";
import { BUCKET, s3 } from "@/lib/s3";

/**
 * AOB205 preview harness: streams the published Gaussian model for the AOB205
 * classroom space without the share-token view accounting, so the client
 * viewer can be reloaded freely during design review. Pinned to one space.
 */
const AOB205_SPACE_ID = "88848b0d-af09-44e6-9165-168a08127be1";
const MODEL_RE = /^[0-9a-f-]{36}$/i;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const override = req.nextUrl.searchParams.get("model");
    let q = admin
      .from("digital_twin_models")
      .select("id, storage_key, model_format, status, is_primary")
      .eq("space_id", AOB205_SPACE_ID)
      .eq("status", "ready")
      .is("deleted_at", null);
    q = override && MODEL_RE.test(override) ? q.eq("id", override) : q.eq("is_primary", true);
    const { data: model } = await q.limit(1).maybeSingle();
    if (!model?.storage_key) return notFound("No published model");

    const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: model.storage_key }));
    const body = object.Body as { transformToWebStream?: () => ReadableStream<Uint8Array> } | undefined;
    const stream = body?.transformToWebStream?.();
    if (!stream) return serverError("Unable to stream model asset");
    const headers = new Headers({
      "Content-Type": object.ContentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    });
    if (object.ContentLength != null) headers.set("Content-Length", String(object.ContentLength));
    return new Response(stream, { status: 200, headers });
  } catch (err) {
    console.error("[GET /preview/aob205/twin-asset]", err);
    return serverError("Model stream failed");
  }
}
