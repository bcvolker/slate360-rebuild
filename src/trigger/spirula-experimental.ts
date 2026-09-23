import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

const TRAINER_SHA = "e6d38a2a900bb1eddc73c68051cc625e88809c5f";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const spirulaExperimentalTask = task({
  id: "spirula.experimental",
  maxDuration: 120,
  retry: { maxAttempts: 1 },
  run: async (payload: { experimentId: string }) => {
    const experimentId = payload.experimentId?.trim();
    if (!experimentId) throw new Error("experimentId is required");

    const endpoint = process.env.MODAL_SPIRULA_EXPERIMENTAL_ENDPOINT?.trim();
    const secret = process.env.GPU_WORKER_SECRET_KEY?.trim();
    if (!endpoint) throw new Error("MODAL_SPIRULA_EXPERIMENTAL_ENDPOINT is not configured");
    if (!secret) throw new Error("GPU_WORKER_SECRET_KEY is not configured");

    const supabase = admin();
    const { data: job, error } = await supabase
      .from("spirula_experimental_jobs")
      .select("id, status, config")
      .eq("experiment_id", experimentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!job) throw new Error(`experiment not found: ${experimentId}`);
    if (job.status !== "queued") {
      return { skipped: true, reason: `status ${job.status}` };
    }
    if (job.config?.profile !== "smoke") {
      throw new Error("only the smoke profile can dispatch");
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dispatch-token": secret,
      },
      body: JSON.stringify({ experimentId, profile: "smoke" }),
    });
    const body = (await response.json().catch(() => ({}))) as { callId?: string; error?: string };
    if (response.status === 409) {
      return { skipped: true, reason: body.error ?? "already active" };
    }
    if (!response.ok) {
      await supabase
        .from("spirula_experimental_jobs")
        .update({
          status: "failed",
          error_text: body.error ?? `modal ${response.status}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)
        .eq("status", "queued");
      throw new Error(body.error ?? `modal ${response.status}`);
    }

    await supabase
      .from("spirula_experimental_jobs")
      .update({
        status: "preparing",
        modal_call_id: body.callId ?? null,
        trainer_sha: TRAINER_SHA,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "queued");

    return { accepted: true, experimentId, callId: body.callId ?? null };
  },
});
