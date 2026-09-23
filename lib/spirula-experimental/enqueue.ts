import { tasks } from "@trigger.dev/sdk/v3";
import type { SupabaseClient } from "@supabase/supabase-js";

const TRAINER_SHA = "e6d38a2a900bb1eddc73c68051cc625e88809c5f";

export type SpirulaEnqueueInput = {
  experimentId: string;
  captureId: string;
  projectId?: string | null;
  profile: string;
};

export async function enqueueSpirulaExperiment(admin: SupabaseClient, input: SpirulaEnqueueInput) {
  if (input.profile !== "smoke") {
    return { ok: false as const, status: 403, error: "only the smoke profile can launch" };
  }
  const experimentId = input.experimentId.trim();
  const captureId = input.captureId.trim();
  if (!experimentId || experimentId.includes("/") || !captureId) {
    return { ok: false as const, status: 400, error: "experimentId and captureId are required" };
  }

  const config = {
    profile: "smoke",
    gpu: "T4",
    expectedMinutes: 20,
    usdPerHour: 0.59,
    trainerSha: TRAINER_SHA,
    dataFormat: "colmap",
  };

  const { data: existing } = await admin
    .from("spirula_experimental_jobs")
    .select("id, status, experiment_id")
    .eq("experiment_id", experimentId)
    .maybeSingle();

  if (existing && existing.status !== "queued") {
    return { ok: true as const, jobId: existing.id, experimentId, status: existing.status, dispatched: false };
  }

  const row = existing
    ? existing
    : (
        await admin
          .from("spirula_experimental_jobs")
          .insert({
            experiment_id: experimentId,
            capture_id: captureId,
            project_id: input.projectId || null,
            status: "queued",
            trainer: "spirula",
            trainer_sha: TRAINER_SHA,
            config,
          })
          .select("id, status, experiment_id")
          .single()
      ).data;

  if (!row) {
    return { ok: false as const, status: 500, error: "could not record the experiment" };
  }

  const handle = await tasks.trigger(
    "spirula.experimental",
    { experimentId },
    { idempotencyKey: `spirula-exp-${experimentId}`, idempotencyKeyTTL: "24h" },
    { clientConfig: { previewBranch: "" } },
  );

  return {
    ok: true as const,
    jobId: row.id,
    experimentId,
    status: "queued",
    dispatched: true,
    triggerRunId: handle.id,
  };
}
