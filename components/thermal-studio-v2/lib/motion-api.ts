export type MotionMode = "timelapse" | "video";

export type MotionSettings = {
  aspect: "original" | "16:9" | "9:16" | "1:1" | "4:3" | "21:9";
  fps: number;
  smoothing: "none" | "interpolate" | "rife";
  deflicker: boolean;
  overlay: "clean" | "keep" | "animate";
  retainRadiometric: boolean;
};

export const DEFAULT_MOTION_SETTINGS: MotionSettings = {
  aspect: "16:9",
  fps: 12,
  smoothing: "interpolate",
  deflicker: true,
  overlay: "clean",
  retainRadiometric: true,
};

export type MotionDispatchResult = { dispatched: boolean; frames: number } | { error: string };

/**
 * S8-M Motion: reuses the EXISTING /api/ops/thermal/timelapse route + Modal
 * `timelapse` endpoint (both shipped and deployed already — S8's "ports the
 * old Motion engine" — no new backend for this slice).
 */
export async function dispatchMotionRender(
  sessionId: string,
  mode: MotionMode,
  frameIds: string[],
  settings: MotionSettings,
): Promise<MotionDispatchResult> {
  try {
    const res = await fetch("/api/ops/thermal/timelapse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, mode, frameIds, settings }),
    });
    const json = await res.json();
    if (!res.ok) return { error: json?.error ?? "Failed to start render" };
    const data = json.data ?? json;
    return { dispatched: Boolean(data.dispatched), frames: Number(data.frames ?? frameIds.length) };
  } catch {
    return { error: "Network error — render not started" };
  }
}
