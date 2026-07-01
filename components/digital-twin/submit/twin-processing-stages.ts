/**
 * Canonical Twin reconstruction stages — the single source the submit-status
 * checklist renders. Keys are kept in sync with the Modal worker's post_progress()
 * calls and the /api/twin/jobs/[id]/progress route's VALID_STAGES.
 *
 * `elapsedStart` (seconds since started_at) drives the TIME-BASED FALLBACK: if the
 * worker never posts a stage (missing signal / heartbeat dropped), we estimate the
 * active stage from elapsed time so the UI never freezes on a single value again.
 */
export type TwinStageKey = "upload" | "align" | "train" | "optimize" | "export";

export type TwinStage = {
  key: TwinStageKey;
  label: string;
  hint: string;
  elapsedStart: number;
};

export const TWIN_STAGES: readonly TwinStage[] = [
  { key: "upload", label: "Upload", hint: "Preparing your capture", elapsedStart: 0 },
  { key: "align", label: "Align", hint: "Matching camera positions", elapsedStart: 90 },
  { key: "train", label: "Train", hint: "Building the Gaussian splat", elapsedStart: 300 },
  { key: "optimize", label: "Optimize", hint: "Cleaning & meshing", elapsedStart: 1800 },
  { key: "export", label: "Export", hint: "Packaging your model", elapsedStart: 2040 },
] as const;

/** Human ETA band shown under the checklist. */
export const TWIN_ETA_LABEL = "Usually 20–40 min";

const STAGE_INDEX: Record<string, number> = Object.fromEntries(
  TWIN_STAGES.map((s, i) => [s.key, i]),
);

/**
 * Resolve which stage is currently active.
 * - Prefer the worker-reported `stage` (authoritative).
 * - Else estimate from `elapsedSeconds` against each stage's elapsedStart.
 * - Never regress below the reported/estimated floor.
 */
export function resolveActiveStageIndex(
  stage: string | null | undefined,
  elapsedSeconds: number | null,
): number {
  if (stage && stage in STAGE_INDEX) return STAGE_INDEX[stage];

  if (elapsedSeconds != null && Number.isFinite(elapsedSeconds)) {
    let idx = 0;
    for (let i = 0; i < TWIN_STAGES.length; i += 1) {
      if (elapsedSeconds >= TWIN_STAGES[i].elapsedStart) idx = i;
    }
    return idx;
  }

  return 0;
}

/** Elapsed seconds since an ISO timestamp, or null if unusable. */
export function elapsedSecondsSince(startedAt: string | null | undefined, nowMs: number): number | null {
  if (!startedAt) return null;
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return null;
  return Math.max(0, Math.floor((nowMs - started) / 1000));
}

/** Compact elapsed label: "0:42", "12:05", "1h 05m". */
export function formatElapsed(totalSeconds: number | null): string {
  if (totalSeconds == null) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
