import { upsertKeyframe, type OperatorKeyframe } from "./keyframes";
import { wrapYaw, type RedactionRule } from "./redaction";
import type { OperatorPatch } from "./types";

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

export function rearYawFromView(yaw: number): number {
  return wrapYaw(yaw + 180);
}

export function keyframeAtView(
  view: { t: number; yaw: number; pitch: number },
  patch: OperatorPatch,
  extra?: Partial<OperatorKeyframe>,
): OperatorKeyframe {
  return {
    t: view.t,
    yawCenter: rearYawFromView(view.yaw),
    yawWidth: patch.rearYawWidth,
    pitchTop: patch.pitchMax,
    pitchBottom: patch.pitchMin,
    nadirRadius: patch.nadirRadius,
    feather: 0.08,
    style: "solid",
    ...extra,
  };
}

export function applyKeyframe(patch: OperatorPatch, frame: OperatorKeyframe): OperatorPatch {
  return {
    ...patch,
    enabled: true,
    rearYawCenter: frame.yawCenter,
    rearYawWidth: frame.yawWidth,
    pitchMax: frame.pitchTop,
    pitchMin: frame.pitchBottom,
    nadirRadius: frame.nadirRadius,
    keyframes: upsertKeyframe(patch.keyframes ?? [], frame),
  };
}
