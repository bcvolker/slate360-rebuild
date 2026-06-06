import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDigitalTwinModelUrl } from "./resolve-model-url";
import { resolveTwinViewerKind } from "./viewer-format";
import type { ProgressionSlide } from "./progression-types";

export type { ProgressionSlide };

export async function loadProgressionModels(
  spaceId: string,
  orgId: string | null,
): Promise<ProgressionSlide[]> {
  if (!orgId) return [];

  const admin = createAdminClient();
  const { data: models } = await admin
    .from("digital_twin_models")
    .select("id, title, storage_key, model_format, capture_id, created_at")
    .eq("space_id", spaceId)
    .eq("org_id", orgId)
    .eq("status", "ready")
    .is("deleted_at", null);

  if (!models?.length) return [];

  const captureIds = [...new Set(models.map((m) => m.capture_id).filter(Boolean))] as string[];
  const captureDates = new Map<string, string>();

  if (captureIds.length) {
    const { data: captures } = await admin
      .from("digital_twin_captures")
      .select("id, created_at, uploaded_at")
      .in("id", captureIds);
    for (const cap of captures ?? []) {
      captureDates.set(cap.id, cap.uploaded_at ?? cap.created_at);
    }
  }

  const sorted = [...models].sort((a, b) => {
    const da = a.capture_id ? captureDates.get(a.capture_id) : null;
    const db = b.capture_id ? captureDates.get(b.capture_id) : null;
    const ta = new Date(da ?? a.created_at).getTime();
    const tb = new Date(db ?? b.created_at).getTime();
    return ta - tb;
  });

  const slides: ProgressionSlide[] = [];
  for (const model of sorted) {
    const viewerKind = resolveTwinViewerKind(model.model_format, model.storage_key);
    if (viewerKind !== "splat") continue;
    const modelUrl = await resolveDigitalTwinModelUrl(model.storage_key);
    const captureDate =
      (model.capture_id && captureDates.get(model.capture_id)) ?? model.created_at;
    slides.push({
      modelId: model.id,
      title: model.title,
      modelUrl,
      captureDate,
      isSplat: true,
    });
  }
  return slides;
}
