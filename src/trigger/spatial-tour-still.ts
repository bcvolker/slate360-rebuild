import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { STILL_FOV } from "@/lib/spatial-tour/look-cone";

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase credentials required");
  return createClient(url, key);
};

type Mark = {
  id: string;
  org_id: string;
  clip_id: string | null;
  t_seconds: number | null;
  yaw_deg: number;
  pitch_deg: number;
  match: string;
};

/**
 * Directed Tour checkpoint still: the published view at the mark (a perspective frame at its
 * yaw/pitch, inside the look cone) from the clip's operator-free public proxy. Modal does the frame grab synchronously; the result is written only if
 * the mark still points at the same clip and time (a newer mark wins over a slow job).
 */
export const spatialTourCheckpointStillTask = task({
  id: "spatial-tour.checkpoint-still",
  maxDuration: 180,
  retry: { maxAttempts: 2 },
  run: async (payload: { markId: string }) => {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("spatial_checkpoint_marks")
      .select("id, org_id, clip_id, t_seconds, yaw_deg, pitch_deg, match")
      .eq("id", payload.markId)
      .maybeSingle();
    const mark = data as Mark | null;
    if (!mark || mark.match === "not_captured" || !mark.clip_id || mark.t_seconds == null) {
      return { skipped: true };
    }
    // Only touch the mark if it still points at this clip and time (a newer mark wins).
    const writeIfCurrent = (patch: Record<string, unknown>) =>
      supabase
        .from("spatial_checkpoint_marks")
        .update(patch)
        .eq("id", mark.id)
        .eq("clip_id", mark.clip_id as string)
        .eq("t_seconds", mark.t_seconds as number)
        .eq("yaw_deg", mark.yaw_deg)
        .eq("pitch_deg", mark.pitch_deg);
    const fail = async (reason: string) => {
      await writeIfCurrent({ still_status: "failed", still_error: reason.slice(0, 500) });
      return { failed: reason };
    };

    const { data: clip } = await supabase.from("spatial_clips").select("public_proxy_key").eq("id", mark.clip_id).maybeSingle();
    if (!clip?.public_proxy_key) return fail("This clip has no operator-free video yet (run the privacy bake)");
    const endpoint = process.env.MODAL_SPATIAL_STILLS_ENDPOINT;
    const secret = process.env.GPU_WORKER_SECRET_KEY;
    if (!endpoint || !secret) return fail("Still extraction is not configured");

    const outputKey = `orgs/${mark.org_id}/spatial-walkthrough/${mark.clip_id}/stills/${mark.id}-${Math.round(mark.t_seconds * 1000)}-${Math.round(mark.yaw_deg)}-${Math.round(mark.pitch_deg)}.jpg`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": secret },
      body: JSON.stringify({
        sourceKey: clip.public_proxy_key,
        t: mark.t_seconds,
        yaw: mark.yaw_deg,
        pitch: mark.pitch_deg,
        hfov: STILL_FOV.h,
        vfov: STILL_FOV.v,
        outputKey,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { key?: string; error?: string; blackFraction?: number };
    if (!res.ok || !json.key) return fail(json.error || `Still worker returned ${res.status}`);
    await writeIfCurrent({
      still_key: json.key,
      still_status: "ready",
      still_error: null,
      still_black_fraction: typeof json.blackFraction === "number" ? json.blackFraction : null,
    });
    return { key: json.key };
  },
});
