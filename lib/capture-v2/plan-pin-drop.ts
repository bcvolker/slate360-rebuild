"use client";

import type { SiteWalkPin } from "@/lib/types/site-walk";
import { enqueueOfflineMutation } from "@/lib/site-walk/offline-db";

export type DropPlanPinArgs = {
  planSheetId: string;
  sessionId: string;
  projectId?: string | null;
  xPct: number;
  yPct: number;
  clientPinId: string;
  pinNumber: number;
};

function buildPinBody(args: DropPlanPinArgs) {
  return {
    plan_sheet_id: args.planSheetId,
    session_id: args.sessionId,
    project_id: args.projectId ?? null,
    x_pct: args.xPct,
    y_pct: args.yPct,
    client_pin_id: args.clientPinId,
    pin_number: args.pinNumber,
    pin_color: "green" as const,
    pin_status: "draft" as const,
  };
}

/** Optimistic local pin keyed by client_pin_id until the server row reconciles. */
function optimisticPin(args: DropPlanPinArgs): SiteWalkPin {
  const now = new Date().toISOString();
  return {
    id: args.clientPinId,
    plan_id: null,
    plan_sheet_id: args.planSheetId,
    item_id: null,
    org_id: "",
    project_id: args.projectId ?? null,
    session_id: args.sessionId,
    x_pct: args.xPct,
    y_pct: args.yPct,
    pin_number: args.pinNumber,
    pin_color: "green",
    client_pin_id: args.clientPinId,
    pin_status: "draft",
    label: null,
    created_by: null,
    markup_data: {},
    created_at: now,
    updated_at: now,
  };
}

async function queuePinOffline(args: DropPlanPinArgs): Promise<SiteWalkPin> {
  await enqueueOfflineMutation({
    kind: "pin_mutation",
    url: "/api/site-walk/pins",
    method: "POST",
    body: buildPinBody(args),
    sessionId: args.sessionId,
  });
  return optimisticPin(args);
}

/**
 * Place a plan pin. Offline-first (S0-B / docs/design/PLAN_PIN_ID_LIFECYCLE.md):
 * a pin dropped offline — even with no photo attached — is queued and rendered
 * optimistically, then flushed by the sync manager. The POST is idempotent on
 * client_pin_id, so a queued re-send never creates a duplicate.
 */
export async function dropPlanPin(args: DropPlanPinArgs): Promise<SiteWalkPin> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return queuePinOffline(args);
  }

  let response: Response;
  try {
    response = await fetch("/api/site-walk/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPinBody(args)),
    });
  } catch {
    // Network failure mid-request → treat as offline: queue + optimistic render.
    return queuePinOffline(args);
  }

  const payload = (await response.json().catch(() => null)) as { pin?: SiteWalkPin; error?: string } | null;
  if (!response.ok || !payload?.pin) {
    throw new Error(payload?.error ?? "Failed to create plan pin.");
  }
  return payload.pin;
}
