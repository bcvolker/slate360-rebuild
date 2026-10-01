import type { OperatorPatch, OperatorPatchFill, PatchStyle } from "./types";
import { DEFAULT_OPERATOR_PATCH } from "./types";
import { wrapYaw, yawInRange } from "./redaction";
import { parseKeyframes } from "./keyframes";

/** Shared later by Walkthrough publisher and Twin face extraction. Do not invent pixels. */
export type OperatorMaskKeyframe = {
  t: number;
  yawCenter: number;
  yawWidth: number;
  pitch: number;
  extent: number;
  feather: number;
  style: PatchStyle;
};

export type OperatorMaskTrack = {
  clipId: string;
  keyframes: OperatorMaskKeyframe[];
};

export function parseOperatorPatch(raw: unknown): OperatorPatch {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_OPERATOR_PATCH };
  const o = raw as Record<string, unknown>;
  const nadirVerticalExtent = clamp(
    num(o.nadirVerticalExtent, num(o.nadirFrac, DEFAULT_OPERATOR_PATCH.nadirVerticalExtent)),
    0.05,
    0.45,
  );
  const rearYawWidth = clamp(
    num(o.rearYawWidth, typeof o.wrapFrac === "number" ? num(o.wrapFrac, 0) * 360 : DEFAULT_OPERATOR_PATCH.rearYawWidth),
    8,
    180,
  );
  return {
    enabled: o.enabled !== false,
    nadirRadius: clamp(num(o.nadirRadius, DEFAULT_OPERATOR_PATCH.nadirRadius), 0.08, 0.6),
    nadirVerticalExtent,
    rearYawCenter: wrapYaw(num(o.rearYawCenter, DEFAULT_OPERATOR_PATCH.rearYawCenter)),
    rearYawWidth,
    pitchMin: clamp(num(o.pitchMin, DEFAULT_OPERATOR_PATCH.pitchMin), -90, 0),
    pitchMax: clamp(num(o.pitchMax, DEFAULT_OPERATOR_PATCH.pitchMax), -90, 40),
    style: parseStyle(o.style),
    fill: parseFill(o.fill),
    logoInPatch: o.logoInPatch !== false,
    showDate: o.showDate !== false,
    showCompass: o.showCompass === true,
    headingDeg: typeof o.headingDeg === "number" && Number.isFinite(o.headingDeg) ? o.headingDeg : null,
    tStart: typeof o.tStart === "number" && Number.isFinite(o.tStart) && o.tStart > 0 ? o.tStart : null,
    tEnd: typeof o.tEnd === "number" && Number.isFinite(o.tEnd) && o.tEnd > 0 ? o.tEnd : null,
    keyframes: parseKeyframes(o.keyframes),
  };
}

export function operatorPatchActiveAt(patch: OperatorPatch, t: number): boolean {
  if (!patch.enabled) return false;
  if (patch.tStart != null && t < patch.tStart) return false;
  if (patch.tEnd != null && t >= patch.tEnd) return false;
  return true;
}

export function resolveOperatorPatch(clipRaw: unknown, walkthroughRaw: unknown): OperatorPatch {
  const walkthrough = parseOperatorPatch(walkthroughRaw);
  if (!clipRaw || typeof clipRaw !== "object" || Object.keys(clipRaw as object).length === 0) {
    return walkthrough;
  }
  return parseOperatorPatch({ ...walkthrough, ...(clipRaw as object) });
}

function parseStyle(v: unknown): PatchStyle {
  return v === "blur" || v === "logo" || v === "solid" ? v : "solid";
}

function parseFill(v: unknown): OperatorPatchFill {
  return v === "brand" ? "brand" : "neutral";
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** ERP mask: 0 = covered (operator), 1 = keep. Handles rear sectors that cross ±180. */
export function buildOperatorMask(width: number, height: number, patch: OperatorPatch): Uint8Array {
  const m = new Uint8Array(width * height);
  m.fill(255);
  if (!patch.enabled) return m;
  const y0 = Math.floor(height * (1 - patch.nadirVerticalExtent));
  for (let y = y0; y < height; y++) {
    m.fill(0, y * width, (y + 1) * width);
  }
  const yawMin = wrapYaw(patch.rearYawCenter - patch.rearYawWidth / 2);
  const yawMax = wrapYaw(patch.rearYawCenter + patch.rearYawWidth / 2);
  for (let y = 0; y < height; y++) {
    const pitch = 90 - (y / Math.max(height - 1, 1)) * 180;
    if (pitch < patch.pitchMin || pitch > patch.pitchMax) continue;
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const yaw = (x / Math.max(width, 1)) * 360 - 180;
      if (yawInRange(yaw, yawMin, yawMax)) m[row + x] = 0;
    }
  }
  return m;
}

export function rearSector(patch: OperatorPatch): { yawMin: number; yawMax: number; pitchMin: number; pitchMax: number } {
  return {
    yawMin: wrapYaw(patch.rearYawCenter - patch.rearYawWidth / 2),
    yawMax: wrapYaw(patch.rearYawCenter + patch.rearYawWidth / 2),
    pitchMin: patch.pitchMin,
    pitchMax: patch.pitchMax,
  };
}
