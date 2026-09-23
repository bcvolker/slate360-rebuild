import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { isBakeFresh, parseBakedExport } from "@/lib/digital-twin/bake-hash";
import { resolveDigitalTwinModelUrl } from "@/lib/digital-twin/resolve-model-url";
import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { notFound, serverError } from "@/lib/server/api-response";
import { BUCKET, s3 } from "@/lib/s3";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import type { VnextExploreRepresentation } from "@/lib/vnext/explore-types";
import { clientMayReadSource } from "@/lib/vnext/release/source-visible";
import type { ReleaseRepresentation } from "@/lib/vnext/release/release-rules";
import { projectIncludesCapability } from "@/lib/vnext/scope/read-project-scope";
import { resolvePublicShare, type PublicShareContext } from "./resolve-public-share";
import { publicSourceAllowed } from "./share-rules";

type Admin = any;
type StreamBody = { transformToWebStream?: () => ReadableStream<Uint8Array> };

function joinedProjectId(spaces: unknown): string | null {
  const row = Array.isArray(spaces) ? spaces[0] : spaces;
  const id = row && typeof row === "object" ? (row as { project_id?: unknown }).project_id : null;
  return typeof id === "string" ? id : null;
}

function publicationOf(
  representation: VnextExploreRepresentation,
): Exclude<ReleaseRepresentation, "thermal"> | null {
  if (representation === "reality" || representation === "geometry") return representation;
  if (representation === "360") return "pano360";
  if (representation === "plan") return "plans";
  return null;
}

async function allow(
  admin: Admin,
  share: PublicShareContext,
  representation: VnextExploreRepresentation,
  sourceId: string,
  sourceProjectId: string | null,
): Promise<boolean> {
  if (representation === "thermal") return false;
  const publication = publicationOf(representation);
  if (!publication || !sourceProjectId || share.state !== "active") return false;
  const capability = representation === "360" ? "pano360" : representation === "plan" ? "plans" : representation;
  const included = await projectIncludesCapability(admin, share.projectId, capability);
  const published = await clientMayReadSource(admin, share.projectId, publication, sourceId, null);
  return publicSourceAllowed({
    shareProjectId: share.projectId,
    sourceProjectId,
    targetType: share.target,
    savedRepresentation: share.view?.representation ?? null,
    savedSourceId: share.view?.sourceId ?? null,
    representation,
    sourceId,
    capabilityIncluded: included,
    published,
  });
}

export async function streamPublicTwin(token: string, modelId: string, baked: boolean) {
  const opened = await resolvePublicShare(token);
  if (opened.share.state !== "active") return notFound();
  const admin = opened.admin;
  const { data: model, error } = await admin
    .from("digital_twin_models")
    .select("storage_key, edit_list, baked_export, digital_twin_spaces!inner(project_id)")
    .eq("id", modelId)
    .eq("status", "ready")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return serverError("Model stream failed");
  if (!model?.storage_key) return notFound();
  const kind = resolveTwinViewerKind("", model.storage_key);
  const representation = kind === "splat" ? "reality" : kind === "model" ? "geometry" : null;
  if (!representation) return notFound();
  const gate = await allow(admin, opened.share, representation, modelId, joinedProjectId(model.digital_twin_spaces));
  if (!gate) return notFound();

  let key = model.storage_key as string;
  if (baked && isBakeFresh(model.baked_export, model.edit_list)) {
    key = parseBakedExport(model.baked_export)?.bakedKey ?? key;
  }
  try {
    const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = object.Body as StreamBody | Blob | ReadableStream<Uint8Array> | undefined;
    const stream =
      body && typeof (body as StreamBody).transformToWebStream === "function"
        ? (body as StreamBody).transformToWebStream!()
        : body instanceof Blob || body instanceof ReadableStream
          ? body
          : null;
    if (!stream) return serverError("Model stream failed");
    const headers = new Headers({
      "Content-Type": object.ContentType ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
    });
    if (object.ContentLength != null) headers.set("Content-Length", String(object.ContentLength));
    return new NextResponse(stream as ReadableStream<Uint8Array>, { status: 200, headers });
  } catch {
    return serverError("Model stream failed");
  }
}

async function redirectKey(key: string, filename: string) {
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: `inline; filename="${encodeURIComponent(filename)}"`,
    }),
    { expiresIn: 120 },
  );
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function redirectPublicPreview(token: string, modelId: string) {
  const { admin, share } = await resolvePublicShare(token);
  if (share.state !== "active") return notFound();
  const { data: model, error } = await admin
    .from("digital_twin_models")
    .select("preview_storage_key, storage_key, digital_twin_spaces!inner(project_id)")
    .eq("id", modelId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !model?.preview_storage_key) return notFound();
  const kind = resolveTwinViewerKind("", String(model.storage_key ?? ""));
  const representation = kind === "splat" ? "reality" : kind === "model" ? "geometry" : null;
  if (!representation) return notFound();
  const gate = await allow(admin, share, representation, modelId, joinedProjectId(model.digital_twin_spaces));
  if (!gate) return notFound();
  try {
    const response = NextResponse.redirect(await resolveDigitalTwinModelUrl(model.preview_storage_key));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return serverError("Failed to load preview image");
  }
}

export async function redirectPublicPano(token: string, itemId: string) {
  const { admin, share } = await resolvePublicShare(token);
  if (share.state !== "active") return notFound();
  let query = admin.from("site_walk_items").select("s3_key, item_type, title, project_id").eq("id", itemId);
  query = excludeDeletedSiteWalkItems(query);
  const { data: item, error } = await query.maybeSingle();
  if (error || !item?.s3_key || item.item_type !== "photo_360") return notFound();
  const gate = await allow(admin, share, "360", itemId, item.project_id ?? null);
  if (!gate) return notFound();
  try {
    return await redirectKey(item.s3_key, `${item.title || "photo"}.jpg`);
  } catch {
    return serverError("Failed to load image");
  }
}

export async function redirectPublicPlan(token: string, sheetId: string) {
  const { admin, share } = await resolvePublicShare(token);
  if (share.state !== "active") return notFound();
  const { data: sheet, error } = await admin
    .from("site_walk_plan_sheets")
    .select("sheet_name, image_s3_key, thumbnail_s3_key, rasterized_key, project_id")
    .eq("id", sheetId)
    .maybeSingle();
  if (error) return notFound();
  const key = sheet?.rasterized_key ?? sheet?.thumbnail_s3_key ?? sheet?.image_s3_key;
  if (!key) return notFound();
  const gate = await allow(admin, share, "plan", sheetId, sheet?.project_id ?? null);
  if (!gate) return notFound();
  try {
    return await redirectKey(key, sheet?.sheet_name ?? "plan");
  } catch {
    return serverError("Failed to load plan sheet image");
  }
}
