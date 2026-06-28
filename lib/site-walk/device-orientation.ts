/**
 * Device-orientation tracker for Site Walk capture metadata.
 *
 * Heading (GPS) tells you which way the user faced; it does NOT tell you how the
 * phone was tilted. Ghost-mode angle alignment (lining a follow-up shot up with a
 * prior one) needs tilt + true compass heading. This module keeps a best-effort,
 * always-latest snapshot of DeviceOrientation that `captureMetadata()` reads at
 * shutter time. It never throws and degrades gracefully when unavailable/denied.
 *
 * iOS gates `deviceorientation` behind a permission prompt that must be requested
 * from a user gesture — same pattern as components/digital-twin/useTwinCaptureDeviceSensors.ts.
 */

export interface DeviceOrientationSnapshot {
  /** Compass direction the device's top points, 0–360 (relative unless `absolute`). */
  alpha: number | null;
  /** Front-to-back tilt, -180..180. */
  beta: number | null;
  /** Left-to-right tilt, -90..90. */
  gamma: number | null;
  /** True heading from iOS `webkitCompassHeading` (0–360), when available. */
  compass_heading: number | null;
  /** Whether the reading is earth-referenced (deviceorientationabsolute). */
  absolute: boolean;
  updated_at: string;
}

type Latest = {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  compass: number | null;
  absolute: boolean;
  ts: number;
};

let latest: Latest | null = null;
let started = false;

const STALE_MS = 5000;

function round1(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

function onOrientation(event: DeviceOrientationEvent) {
  const compass =
    typeof (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
      .webkitCompassHeading === "number"
      ? (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading ?? null
      : null;
  if (event.alpha === null && event.beta === null && event.gamma === null && compass === null) {
    return;
  }
  latest = {
    alpha: event.alpha,
    beta: event.beta,
    gamma: event.gamma,
    compass,
    absolute: Boolean((event as DeviceOrientationEvent & { absolute?: boolean }).absolute),
    ts: Date.now(),
  };
}

/** Attach the listeners (idempotent, no-throw). Safe to call without permission. */
export function startDeviceOrientationTracking(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    // Prefer earth-referenced orientation where the browser exposes it.
    window.addEventListener("deviceorientationabsolute", onOrientation as EventListener, { passive: true });
    window.addEventListener("deviceorientation", onOrientation as EventListener, { passive: true });
  } catch {
    /* best-effort */
  }
}

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/**
 * Request iOS permission (must be called from a user gesture). On Android / browsers
 * without the gate, this just starts tracking. Returns the resolved permission state.
 */
export async function ensureDeviceOrientationPermission(): Promise<"granted" | "denied" | "unavailable"> {
  if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") {
    return "unavailable";
  }
  const ctor = DeviceOrientationEvent as OrientationCtor;
  if (typeof ctor.requestPermission !== "function") {
    startDeviceOrientationTracking();
    return "granted";
  }
  try {
    const res = await ctor.requestPermission();
    if (res === "granted") {
      startDeviceOrientationTracking();
      return "granted";
    }
    return "denied";
  } catch {
    return "denied";
  }
}

/** Latest orientation, or null when none/stale. Used by captureMetadata(). */
export function getDeviceOrientationSnapshot(): DeviceOrientationSnapshot | null {
  if (!latest) return null;
  if (Date.now() - latest.ts > STALE_MS) return null;
  return {
    alpha: round1(latest.alpha),
    beta: round1(latest.beta),
    gamma: round1(latest.gamma),
    compass_heading: round1(latest.compass),
    absolute: latest.absolute,
    updated_at: new Date(latest.ts).toISOString(),
  };
}
