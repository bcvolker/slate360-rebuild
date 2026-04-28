"use client";

import { buildCreateCaptureItemBody, type CreateCaptureItemParams } from "@/lib/site-walk/capture-item-client";
import { createOfflineId, enqueueOfflineMutation, listOfflineMutations, saveOfflineBlob } from "@/lib/site-walk/offline-db";
import type { UpdateItemPayload } from "@/lib/types/site-walk";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

type PlanTarget = { planSheetId: string; xPct: number; yPct: number; pinId?: string };

type QueueCaptureParams = CreateCaptureItemParams & {
  file?: File;
  planTarget?: PlanTarget | null;
  previewUrl?: string | null;
};

export async function queueOfflineCapture(params: QueueCaptureParams): Promise<CaptureItemRecord> {
  const clientItemId = params.clientItemId ?? createOfflineId("item");
  const clientMutationId = params.clientMutationId ?? createOfflineId("mutation");
  const blobId = params.file ? createOfflineId("blob") : undefined;
  const upload = params.file ? {
    filename: params.file.name,
    contentType: params.file.type || "image/jpeg",
    fileSizeBytes: params.file.size,
  } : undefined;

  if (params.file && blobId) {
    await saveOfflineBlob({ id: blobId, blob: params.file, filename: params.file.name, contentType: upload?.contentType ?? "application/octet-stream", size: params.file.size });
  }

  const body = buildCreateCaptureItemBody({
    ...params,
    clientItemId,
    clientMutationId,
    uploadState: params.file ? "queued" : "none",
  });

  await enqueueOfflineMutation({
    kind: "item_create",
    url: "/api/site-walk/items",
    method: "POST",
    body,
    sessionId: params.sessionId,
    localClientItemId: clientItemId,
    blobId,
    upload,
  });

  if (params.planTarget) {
    await enqueuePlanTargetMutation(params.sessionId, clientItemId, params.planTarget);
  }

  return localItemFromBody(body, clientItemId, clientMutationId, params.previewUrl ?? null);
}

export async function queueOfflineItemPatch(sessionId: string, item: CaptureItemRecord, patch: UpdateItemPayload) {
  const localClientItemId = item.client_item_id ?? (item.id.startsWith("item-") ? item.id : undefined);
  await enqueueOfflineMutation({
    kind: "item_patch",
    url: `/api/site-walk/items/${encodeURIComponent(item.id)}`,
    method: "PATCH",
    body: { ...patch, sync_state: "synced" },
    sessionId,
    localClientItemId,
  });
}

export async function loadOfflineItemsForSession(sessionId: string) {
  const mutations = await listOfflineMutations();
  return mutations
    .filter((mutation) => mutation.kind === "item_create" && mutation.sessionId === sessionId && mutation.body)
    .map((mutation) => localItemFromBody(mutation.body as Record<string, unknown>, mutation.localClientItemId ?? mutation.id, String(mutation.body?.client_mutation_id ?? mutation.id), null));
}

async function enqueuePlanTargetMutation(sessionId: string, clientItemId: string, target: PlanTarget) {
  const body = target.pinId
    ? { item_id: `__client:${clientItemId}`, pin_status: "active" }
    : {
        plan_sheet_id: target.planSheetId,
        item_id: `__client:${clientItemId}`,
        x_pct: target.xPct,
        y_pct: target.yPct,
        pin_status: "active",
        pin_color: "blue",
        label: "Plan-linked capture",
      };
  await enqueueOfflineMutation({
    kind: "pin_mutation",
    url: target.pinId ? `/api/site-walk/pins/${encodeURIComponent(target.pinId)}` : "/api/site-walk/pins",
    method: target.pinId ? "PATCH" : "POST",
    body,
    sessionId,
    localClientItemId: clientItemId,
  });
}

function localItemFromBody(body: Record<string, unknown>, clientItemId: string, clientMutationId: string, previewUrl: string | null): CaptureItemRecord {
  const now = new Date().toISOString();
  return {
    id: clientItemId,
    session_id: String(body.session_id ?? ""),
    client_item_id: clientItemId,
    client_mutation_id: clientMutationId,
    item_type: body.item_type as CaptureItemRecord["item_type"],
    title: String(body.title ?? ""),
    description: typeof body.description === "string" ? body.description : null,
    category: typeof body.category === "string" ? body.category : null,
    priority: "medium",
    item_status: "open",
    assigned_to: null,
    due_date: typeof body.due_date === "string" ? body.due_date : null,
    capture_mode: body.capture_mode as CaptureItemRecord["capture_mode"],
    sync_state: "pending",
    upload_state: body.upload_state === "queued" ? "queued" : "none",
    local_preview_url: previewUrl,
    created_at: now,
    updated_at: now,
  };
}
