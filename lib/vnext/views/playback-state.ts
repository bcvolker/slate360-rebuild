import type { TwinCameraPath } from "@/lib/digital-twin/camera-path-types";

export type PlaybackStatus = "idle" | "playing" | "paused";

export type PlaybackState = {
  status: PlaybackStatus;
  elapsedMs: number;
};

export function playbackPlay(state: PlaybackState): PlaybackState {
  return { status: "playing", elapsedMs: state.elapsedMs };
}

export function playbackPause(state: PlaybackState): PlaybackState {
  if (state.status !== "playing") return state;
  return { status: "paused", elapsedMs: state.elapsedMs };
}

export function playbackRestart(): PlaybackState {
  return { status: "paused", elapsedMs: 0 };
}

export function playbackTick(
  state: PlaybackState,
  deltaMs: number,
  totalMs: number,
  loop: boolean,
): PlaybackState {
  if (state.status !== "playing") return state;
  const total = Math.max(0, totalMs);
  const next = state.elapsedMs + Math.max(0, deltaMs);
  if (total === 0) return { status: "paused", elapsedMs: 0 };
  if (next < total) return { status: "playing", elapsedMs: next };
  if (loop) return { status: "playing", elapsedMs: next % total };
  return { status: "paused", elapsedMs: total };
}

export function pathDurationMs(durations: readonly number[]): number {
  return durations.reduce((sum, value) => sum + value, 0);
}

export function playbackModelMatches(pathModelId: string, activeModelId: string): boolean {
  return pathModelId.length > 0 && pathModelId === activeModelId;
}

/** Matches `segmentDurations` without pulling the 3D math module into the shell. */
export function pathPlayDurationMs(path: TwinCameraPath): number {
  if (path.keyframes.length < 2) return 0;
  let total = 0;
  for (let index = 0; index < path.keyframes.length - 1; index += 1) {
    total += Math.max(200, path.keyframes[index]?.durationMs ?? 2000);
  }
  return total;
}

export function pathIsPlayable(path: TwinCameraPath | null): boolean {
  return Boolean(path && path.keyframes.length >= 2);
}

export type PlaybackSession = {
  modelId: string;
  path: TwinCameraPath;
  playback: PlaybackState;
};

/** Same model keeps the running clock. A different model starts idle so a path cannot cross models. */
export function adoptPlaybackPath(
  session: PlaybackSession | null,
  modelId: string,
  path: TwinCameraPath,
): PlaybackSession {
  if (session && playbackModelMatches(session.modelId, modelId)) {
    return { modelId, path, playback: session.playback };
  }
  return { modelId, path, playback: { status: "idle", elapsedMs: 0 } };
}
