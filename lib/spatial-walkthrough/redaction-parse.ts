import { parseKeyframes, parseStyle } from "./keyframes";
import type { RedactionRule } from "./redaction";

export function parseRedactionRow(row: Record<string, unknown>): RedactionRule {
  return {
    id: row.id ? String(row.id) : undefined,
    clipId: String(row.clip_id ?? row.clipId ?? ""),
    tStart: Number(row.t_start ?? row.tStart),
    tEnd: Number(row.t_end ?? row.tEnd),
    yawMin: row.yaw_min == null && row.yawMin == null ? null : Number(row.yaw_min ?? row.yawMin),
    yawMax: row.yaw_max == null && row.yawMax == null ? null : Number(row.yaw_max ?? row.yawMax),
    pitchMin: row.pitch_min == null && row.pitchMin == null ? null : Number(row.pitch_min ?? row.pitchMin),
    pitchMax: row.pitch_max == null && row.pitchMax == null ? null : Number(row.pitch_max ?? row.pitchMax),
    mode: (row.mode as RedactionRule["mode"]) ?? "skip",
    policy: (row.policy as RedactionRule["policy"]) ?? "public",
    reason: (row.reason as string) ?? null,
    waypointId: row.waypoint_id || row.waypointId ? String(row.waypoint_id ?? row.waypointId) : null,
    feather: typeof row.feather === "number" ? row.feather : null,
    style: row.style == null ? null : parseStyle(row.style),
    keyframes: parseKeyframes(row.keyframes),
  };
}
