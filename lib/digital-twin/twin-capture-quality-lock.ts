/**
 * Twin capture "Quality Lock" — best-effort camera-setting locks for consistent
 * photogrammetry/splat input (see docs/specs/TWIN_CAPTURE_CAMERA.md).
 *
 * Reconstruction wants consistent frames: locking exposure / white balance / focus
 * / ISO stops the camera drifting frame-to-frame. Browser support is uneven —
 * Android Chrome exposes manual modes, iOS Safari exposes almost none — so every
 * call is guarded and we only lock what the device actually reports.
 */
import { getTwinVideoTrack } from "@/lib/digital-twin/twin-capture-device";

export type QualityLockControlId = "exposure" | "whiteBalance" | "focus" | "iso";

export const QUALITY_LOCK_CONTROLS: ReadonlyArray<{ id: QualityLockControlId; label: string }> = [
  { id: "exposure", label: "Exposure" },
  { id: "whiteBalance", label: "White bal." },
  { id: "focus", label: "Focus" },
  { id: "iso", label: "ISO" },
];

export type QualityLockSupport = Record<QualityLockControlId, boolean>;
export type QualityLockState = Record<QualityLockControlId, boolean>;

export const QUALITY_LOCK_ALL_ON: QualityLockState = {
  exposure: true,
  whiteBalance: true,
  focus: true,
  iso: true,
};

export const QUALITY_LOCK_NONE_SUPPORTED: QualityLockSupport = {
  exposure: false,
  whiteBalance: false,
  focus: false,
  iso: false,
};

// Advanced media-track fields that aren't in the stock DOM lib typings.
type AdvancedCapabilities = MediaTrackCapabilities & {
  exposureMode?: string[];
  whiteBalanceMode?: string[];
  focusMode?: string[];
  iso?: { min?: number; max?: number };
};
type AdvancedSettings = MediaTrackSettings & {
  exposureTime?: number;
  colorTemperature?: number;
  focusDistance?: number;
  iso?: number;
};
type AdvancedConstraintSet = MediaTrackConstraintSet & {
  exposureMode?: "manual" | "continuous";
  whiteBalanceMode?: "manual" | "continuous";
  focusMode?: "manual" | "continuous";
  exposureTime?: number;
  colorTemperature?: number;
  focusDistance?: number;
  iso?: number;
};

function supportsManual(modes: string[] | undefined): boolean {
  return Array.isArray(modes) && modes.includes("manual");
}

export function detectQualityLockSupport(track: MediaStreamTrack | null): QualityLockSupport {
  if (!track?.getCapabilities) return { ...QUALITY_LOCK_NONE_SUPPORTED };
  const caps = track.getCapabilities() as AdvancedCapabilities;
  if (!caps) return { ...QUALITY_LOCK_NONE_SUPPORTED };
  return {
    exposure: supportsManual(caps.exposureMode),
    whiteBalance: supportsManual(caps.whiteBalanceMode),
    focus: supportsManual(caps.focusMode),
    iso: Boolean(caps.iso && typeof caps.iso.max === "number"),
  };
}

export function isAnyQualityLockSupported(support: QualityLockSupport): boolean {
  return support.exposure || support.whiteBalance || support.focus || support.iso;
}

/**
 * Lock the supported + enabled controls to their *current* auto values (so every
 * subsequent frame matches), and release any toggled-off control back to
 * continuous/auto. Unsupported controls are skipped. Always guarded — a rejected
 * constraint never throws to the caller.
 */
export async function applyQualityLock(
  stream: MediaStream | null,
  support: QualityLockSupport,
  state: QualityLockState,
): Promise<boolean> {
  const track = getTwinVideoTrack(stream);
  if (!track?.applyConstraints) return false;
  const settings = (track.getSettings?.() ?? {}) as AdvancedSettings;
  const set: AdvancedConstraintSet = {};

  if (support.exposure) {
    set.exposureMode = state.exposure ? "manual" : "continuous";
    if (state.exposure && typeof settings.exposureTime === "number") {
      set.exposureTime = settings.exposureTime;
    }
  }
  if (support.whiteBalance) {
    set.whiteBalanceMode = state.whiteBalance ? "manual" : "continuous";
    if (state.whiteBalance && typeof settings.colorTemperature === "number") {
      set.colorTemperature = settings.colorTemperature;
    }
  }
  if (support.focus) {
    set.focusMode = state.focus ? "manual" : "continuous";
    if (state.focus && typeof settings.focusDistance === "number") {
      set.focusDistance = settings.focusDistance;
    }
  }
  if (support.iso && state.iso && typeof settings.iso === "number") {
    set.iso = settings.iso;
  }

  if (Object.keys(set).length === 0) return false;
  try {
    await track.applyConstraints({ advanced: [set] });
    return true;
  } catch {
    return false;
  }
}
