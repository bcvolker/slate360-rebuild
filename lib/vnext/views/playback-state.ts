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
