import { z } from "zod";
import { SlateContentEditSpecSchema } from "./spec-core";

/**
 * Render job envelopes — the contract between the Next.js API, the Trigger.dev
 * task, and the Modal worker (which calls back to the HMAC-verified route).
 *
 * Determinism / idempotency: the frozen spec snapshot is written to R2 at enqueue
 * (`Content Studio/Projects/{id}/spec-{hash}.json`); the job row holds only the R2
 * key + content hash. Retries reuse the snapshot, never the live edit state.
 */

export const RENDER_JOB_REQUEST_VERSION = 1 as const;
export const RENDER_CALLBACK_VERSION = 1 as const;

export const ContentJobTypeSchema = z.enum([
  "ingest",
  "render",
  "enhance",
  "multicam_sync",
  "caption",
  "preview_snapshot",
]);
export type ContentJobType = z.infer<typeof ContentJobTypeSchema>;

export const RenderJobStatusSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);
export type RenderJobStatus = z.infer<typeof RenderJobStatusSchema>;

/** Pointer to the frozen spec snapshot in R2 (not the inline live spec). */
export const SpecRefSchema = z.object({
  specId: z.string().min(1),
  contentHash: z.string().min(1),
  snapshotKey: z.string().min(1), // R2 key of the frozen JSON
});
export type SpecRef = z.infer<typeof SpecRefSchema>;

export const PreflightSchema = z.object({
  estimatedCredits: z.number().nonnegative(),
  estimatedDurationSec: z.number().nonnegative(),
  outputPixels: z.number().int().nonnegative(),
  effectCount: z.number().int().nonnegative().default(0),
  is360: z.boolean().default(false),
  rejected: z.literal(false).default(false),
});
export type Preflight = z.infer<typeof PreflightSchema>;

export const RenderJobRequestSchema = z.object({
  version: z.literal(RENDER_JOB_REQUEST_VERSION),
  jobId: z.string().min(1),
  orgId: z.string().min(1),
  editProjectId: z.string().min(1),
  jobType: ContentJobTypeSchema,
  /** For render: pointer to frozen snapshot. For ingest: omitted. */
  specRef: SpecRefSchema.optional(),
  /** Optional inline spec (used by mock mode / validation); production uses specRef. */
  spec: SlateContentEditSpecSchema.optional(),
  preflight: PreflightSchema.optional(),
  idempotencyKey: z.string().min(1), // sha256(orgId + contentHash + jobType + output profile)
  requestedBy: z.string().min(1),
  enqueuedAt: z.string().min(1), // ISO — stamped by API, never inside the worker
});
export type RenderJobRequest = z.infer<typeof RenderJobRequestSchema>;

export const RenderOutputSchema = z.object({
  kind: z.enum(["video", "image", "proxy", "thumbnail", "sidecar"]),
  storageKey: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSec: z.number().nonnegative().optional(),
  bytes: z.number().int().nonnegative().optional(),
  unifiedFileId: z.string().optional(),
});
export type RenderOutput = z.infer<typeof RenderOutputSchema>;

export const RenderCostSchema = z.object({
  estimatedCredits: z.number().nonnegative().default(0),
  actualCredits: z.number().nonnegative().default(0),
  computeSec: z.number().nonnegative().default(0),
  storageBytesAdded: z.number().int().nonnegative().default(0),
});

export const RenderCallbackSchema = z.object({
  version: z.literal(RENDER_CALLBACK_VERSION),
  jobId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  status: RenderJobStatusSchema,
  progressPct: z.number().min(0).max(100).default(0),
  stage: z.string().optional(),
  workerRunId: z.string().optional(),
  outputs: z.array(RenderOutputSchema).optional(),
  cost: RenderCostSchema.optional(),
  error: z
    .object({
      code: z.string(), // e.g. PREFLIGHT_REJECTED | FFMPEG_FAILED | TIMEOUT
      message: z.string(),
      retryable: z.boolean().default(false),
    })
    .optional(),
  contentHash: z.string().optional(),
  completedAt: z.string().optional(), // ISO
});
export type RenderCallback = z.infer<typeof RenderCallbackSchema>;
