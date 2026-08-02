import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, s3 } from "@/lib/s3";
import { NextResponse } from "next/server";

type Admin = ReturnType<typeof createAdminClient>;

const IMAGE_KINDS = new Set(["photo", "drone_photo", "panorama_360"]);

/**
 * Stream a capture asset that belongs to the model's capture (org-scoped).
 * Only image kinds are streamed for Photo Explorer click-to-photo.
 */
export async function streamCapturePhotoForModel(
  admin: Admin,
  params: { orgId: string; modelId: string; assetId: string },
): Promise<NextResponse> {
  const { data: model } = await admin
    .from("digital_twin_models")
    .select("id, capture_id, org_id")
    .eq("id", params.modelId)
    .eq("org_id", params.orgId)
    .eq("status", "ready")
    .is("deleted_at", null)
    .maybeSingle();

  if (!model?.capture_id) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  const { data: asset } = await admin
    .from("digital_twin_capture_assets")
    .select("id, storage_key, content_type, asset_kind, file_name, status")
    .eq("id", params.assetId)
    .eq("org_id", params.orgId)
    .eq("capture_id", model.capture_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!asset?.storage_key || asset.status !== "ready") {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
  if (!IMAGE_KINDS.has(asset.asset_kind ?? "")) {
    return NextResponse.json(
      { error: "Source is not a still photo", assetKind: asset.asset_kind },
      { status: 415 },
    );
  }

  try {
    const object = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: asset.storage_key }),
    );
    const body = object.Body;
    if (!body) return NextResponse.json({ error: "Empty object" }, { status: 404 });

    const stream =
      typeof (body as { transformToWebStream?: () => ReadableStream }).transformToWebStream ===
      "function"
        ? (body as { transformToWebStream: () => ReadableStream }).transformToWebStream()
        : (body as ReadableStream);

    return new NextResponse(stream as BodyInit, {
      status: 200,
      headers: {
        "content-type": asset.content_type || object.ContentType || "image/jpeg",
        "cache-control": "private, max-age=300",
        "content-disposition": `inline; filename="${(asset.file_name || "photo").replace(/"/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Photo unavailable" }, { status: 404 });
  }
}
