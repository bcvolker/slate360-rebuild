/**
 * GET  /api/site-walk/items?session_id=...  — list items for a session
 * POST /api/site-walk/items                 — create a new item
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { bridgePhotoToSlateDrop } from "@/lib/site-walk/slatedrop-bridge";
import { trackStorageUsed } from "@/lib/slatedrop/track-storage";
import type { CreateItemPayload, SiteWalkItemType } from "@/lib/types/site-walk";

const VALID_ITEM_TYPES: SiteWalkItemType[] = [
  "photo",
  "video",
  "text_note",
  "voice_note",
  "annotation",
];

export const GET = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) return badRequest("session_id is required");
    if (!orgId) return badRequest("Organization context required");

    const { data, error } = await admin
      .from("site_walk_items")
      .select("*")
      .eq("session_id", sessionId)
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return serverError(error.message);
    return ok({ items: data });
  });

export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json()) as CreateItemPayload;
    if (!body.session_id) return badRequest("session_id is required");
    if (!body.item_type || !VALID_ITEM_TYPES.includes(body.item_type)) {
      return badRequest(`item_type must be one of: ${VALID_ITEM_TYPES.join(", ")}`);
    }

    // Verify the session exists and belongs to this org
    const { data: session } = await admin
      .from("site_walk_sessions")
      .select("id, project_id")
      .eq("id", body.session_id)
      .eq("org_id", orgId)
      .single();

    if (!session) return badRequest("Session not found or access denied");

    // Get next sort_order
    const { data: lastItem } = await admin
      .from("site_walk_items")
      .select("sort_order")
      .eq("session_id", body.session_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastItem?.sort_order ?? -1) + 1;
    const fileBackedItem = ["photo", "video"].includes(body.item_type);
    const metadata = body.metadata && typeof body.metadata === "object"
      ? (body.metadata as Record<string, unknown>)
      : {};

    let reservedUploadId = body.file_id ?? null;

    if (!reservedUploadId && body.s3_key && fileBackedItem) {
      const { data: reservedUpload } = await admin
        .from("slatedrop_uploads")
        .select("id")
        .eq("s3_key", body.s3_key)
        .eq("org_id", orgId)
        .eq("uploaded_by", user.id)
        .in("status", ["pending", "active"])
        .maybeSingle();

      reservedUploadId = reservedUpload?.id ?? null;
    }

    const { data, error } = await admin
      .from("site_walk_items")
      .insert({
        session_id: body.session_id,
        org_id: orgId,
        created_by: user.id,
        item_type: body.item_type,
        title: body.title?.trim() ?? "",
        description: body.description ?? null,
        file_id: reservedUploadId,
        s3_key: body.s3_key ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        location_label: body.location_label ?? null,
        weather: body.weather ?? null,
        metadata,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) return serverError(error.message);

    const warnings: string[] = [];

    if (data && reservedUploadId && fileBackedItem) {
      const fileSize = metadata.file_size ? Number(metadata.file_size) : 0;
      const uploadUpdates: { status: "active"; file_size?: number } = { status: "active" };
      if (Number.isFinite(fileSize) && fileSize > 0) {
        uploadUpdates.file_size = fileSize;
      }

      const { error: activateError } = await admin
        .from("slatedrop_uploads")
        .update(uploadUpdates)
        .eq("id", reservedUploadId)
        .eq("org_id", orgId)
        .eq("uploaded_by", user.id);

      if (activateError) {
        console.error("[site-walk-items] activate reserved upload error:", activateError);
        warnings.push("Photo saved, but project-file activation failed.");
      } else if (uploadUpdates.file_size) {
        await trackStorageUsed(admin, orgId, reservedUploadId);
      }
    }

    // ── SlateDrop bridge ───────────────────────────────────────────
    // For file-backed items (photo/video), create a corresponding
    // slatedrop_uploads record so captures appear in the project's
    // SlateDrop folder. Awaited to guarantee completion before the
    // serverless function exits. Bridge failures surface as warnings
    // so the client can inform the user without blocking the save.
    if (data && !reservedUploadId && data.s3_key && session.project_id && fileBackedItem) {
      const ext = data.s3_key.split(".").pop()?.toLowerCase() ?? "jpg";
      const fileName =
        body.title?.trim() ||
        `${data.item_type}-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.${ext}`;

      try {
        const bridgeId = await bridgePhotoToSlateDrop(admin, {
          itemId: data.id,
          s3Key: data.s3_key,
          fileName: fileName.endsWith(`.${ext}`) ? fileName : `${fileName}.${ext}`,
          fileType: ext,
          fileSize: metadata.file_size
            ? Number(metadata.file_size)
            : 0,
          projectId: session.project_id,
          orgId,
          userId: user.id,
        });
        if (!bridgeId) {
          warnings.push("SlateDrop bridge failed — photo saved but not linked to project files.");
        }
      } catch (err) {
        console.error("[site-walk-items] bridge error:", err);
        warnings.push("SlateDrop bridge failed — photo saved but not linked to project files.");
      }
    }

    return ok({ item: data, ...(warnings.length > 0 ? { warnings } : {}) });
  });
