import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createAdminClient } from "@/lib/supabase/admin";
import { s3, BUCKET } from "@/lib/s3";
import type { ThermalBrandingConfig } from "@/lib/thermal/types";
import type { ThermalShareViewerData } from "@/lib/thermal/share-viewer-types";
import { filterCapturesByLayerConfig } from "@/lib/thermal/layer-config";

async function signKey(key: string | null): Promise<string | null> {
  if (!key) return null;
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
}

export async function loadThermalShareViewerData(
  sessionId: string,
  brandingSnapshot: Record<string, unknown>,
  layerConfig: Record<string, unknown> = {},
): Promise<ThermalShareViewerData | null> {
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("thermal_analysis_sessions")
    .select("id, name, branding_config, summary_metrics, metadata")
    .eq("id", sessionId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!session) return null;

  const { data: captures } = await admin
    .from("thermal_captures")
    .select("id, filename, preview_path, storage_path, quality_metrics, anomalies, gps_position, metadata")
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const branding = {
    ...(session.branding_config as ThermalBrandingConfig),
    ...(brandingSnapshot as Partial<ThermalBrandingConfig>),
  };

  const enriched = await Promise.all(
    filterCapturesByLayerConfig(captures ?? [], layerConfig).map(async (capture) => {
      const meta = (capture.metadata as Record<string, unknown>) ?? {};
      return {
        id: capture.id,
        filename: capture.filename,
        previewUrl: await signKey(capture.preview_path ?? capture.storage_path),
        qualityMetrics: (capture.quality_metrics as Record<string, unknown>) ?? {},
        anomalies: (capture.anomalies as unknown[]) ?? [],
        gpsPosition: (capture.gps_position as Record<string, unknown>) ?? {},
        findings: typeof meta.findings === "string" ? meta.findings : null,
        tuning: (meta.tuning as Record<string, unknown>) ?? {},
      };
    }),
  );

  const sessionMeta = (session.metadata as Record<string, unknown>) ?? {};
  // Show the curated report set in its chosen order when present (matches the report).
  const reportSet = Array.isArray(sessionMeta.report_set)
    ? (sessionMeta.report_set as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  const orderedCaptures = reportSet.length
    ? [
        ...reportSet.map((id) => enriched.find((c) => c.id === id)).filter((c): c is (typeof enriched)[number] => Boolean(c)),
        ...enriched.filter((c) => !reportSet.includes(c.id)),
      ]
    : enriched;
  const linkedSpaceId =
    (typeof layerConfig.linked_space_id === "string" ? layerConfig.linked_space_id : null) ??
    (typeof sessionMeta.linked_space_id === "string" ? sessionMeta.linked_space_id : null);

  return {
    sessionId: session.id,
    sessionName: session.name,
    role: "view",
    linkedSpaceId,
    branding,
    summaryMetrics: (session.summary_metrics as Record<string, unknown>) ?? {},
    captures: orderedCaptures,
  };
}
