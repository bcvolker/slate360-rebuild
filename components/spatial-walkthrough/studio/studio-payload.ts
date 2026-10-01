import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";

/** Studio GET payload and row mappers, kept apart so WalkthroughStudio stays a composer. */
export type FileRow = { id: string; file_name: string };
export type Payload = {
  walkthrough: Record<string, unknown>;
  clips: Array<Record<string, unknown>>;
  waypoints: Array<Record<string, unknown>>;
  pins: Array<Record<string, unknown>>;
  attachments?: Array<Record<string, unknown>>;
  redactions: Array<Record<string, unknown>>;
  chapters?: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
  shares: Array<{ id: string; token_prefix?: string; policy: string; is_revoked: boolean; expires_at: string | null }>;
  narration?: Array<Record<string, unknown>>;
  transcripts?: Array<Record<string, unknown>>;
  audioAssets?: Array<Record<string, unknown>>;
};

export function ruleFrom(row: Record<string, unknown>): RedactionRule {
  return {
    id: row.id ? String(row.id) : undefined,
    clipId: String(row.clip_id),
    tStart: Number(row.t_start),
    tEnd: Number(row.t_end),
    yawMin: row.yaw_min == null ? null : Number(row.yaw_min),
    yawMax: row.yaw_max == null ? null : Number(row.yaw_max),
    pitchMin: row.pitch_min == null ? null : Number(row.pitch_min),
    pitchMax: row.pitch_max == null ? null : Number(row.pitch_max),
    mode: (row.mode as RedactionRule["mode"]) ?? "skip",
    policy: (row.policy as RedactionRule["policy"]) ?? "public",
    reason: (row.reason as string) ?? null,
    waypointId: row.waypoint_id ? String(row.waypoint_id) : null,
  };
}
