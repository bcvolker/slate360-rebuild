import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createAdminClient } from "@/lib/supabase/admin";
import { s3, BUCKET } from "@/lib/s3";
import type { ThermalAnalysisSession, ThermalCapture, ThermalProcessingJob } from "@/lib/thermal/types";

export type ThermalSessionDetail = {
  session: ThermalAnalysisSession;
  captures: Array<
    ThermalCapture & {
      previewUrl: string | null;
    }
  >;
  latestJob: ThermalProcessingJob | null;
};

async function signPreviewKey(key: string | null): Promise<string | null> {
  if (!key) return null;
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 },
  );
}

export async function loadThermalSessionDetail(sessionId: string): Promise<ThermalSessionDetail | null> {
  const admin = createAdminClient();

  const { data: session, error: sessionError } = await admin
    .from("thermal_analysis_sessions")
    .select("*")
    .eq("id", sessionId)
    .is("deleted_at", null)
    .maybeSingle();

  if (sessionError || !session) return null;

  const { data: captures } = await admin
    .from("thermal_captures")
    .select("*")
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const { data: latestJob } = await admin
    .from("thermal_processing_jobs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const enriched = await Promise.all(
    (captures ?? []).map(async (capture) => ({
      ...(capture as ThermalCapture),
      previewUrl: await signPreviewKey(capture.preview_path ?? capture.storage_path),
    })),
  );

  return {
    session: session as ThermalAnalysisSession,
    captures: enriched,
    latestJob: (latestJob as ThermalProcessingJob | null) ?? null,
  };
}

export async function loadThermalSessionList(orgId: string | null) {
  const admin = createAdminClient();
  let query = admin
    .from("thermal_analysis_sessions")
    .select("id, name, status, metadata, summary_metrics, created_at, updated_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (orgId) query = query.eq("org_id", orgId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
