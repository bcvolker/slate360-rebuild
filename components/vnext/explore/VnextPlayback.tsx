"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { TwinCameraPath } from "@/lib/digital-twin/camera-path-types";
import type { SplatViewerHandle } from "@/components/digital-twin/splat-viewer-constants";
import {
  adoptPlaybackPath,
  pathPlayDurationMs,
  playbackModelMatches,
  playbackPause,
  playbackPlay,
  playbackRestart,
  playbackTick,
  type PlaybackSession,
} from "@/lib/vnext/views/playback-state";

type PlaybackApi = {
  session: PlaybackSession | null;
  activeModelId: string | null;
  play: () => void;
  pause: () => void;
  restart: () => void;
  setPath: (path: TwinCameraPath) => void;
};

const PlaybackContext = createContext<PlaybackApi | null>(null);

export function useVnextPlayback(): PlaybackApi {
  const value = useContext(PlaybackContext);
  if (!value) throw new Error("Saved-view playback is only available inside Explore.");
  return value;
}

type Props = {
  projectId: string;
  persist: "local" | "api";
  representation: string | null;
  sourceId: string | null;
  pathModelId: string | null;
  initialPath: TwinCameraPath | null;
  getHandle: () => SplatViewerHandle | null;
  children: ReactNode;
};

export function VnextPlaybackProvider({
  projectId,
  persist,
  representation,
  sourceId,
  pathModelId,
  initialPath,
  getHandle,
  children,
}: Props) {
  const [session, setSession] = useState<PlaybackSession | null>(null);
  const activeModelId = representation === "reality" ? pathModelId ?? sourceId : null;

  useEffect(() => {
    if (!activeModelId) {
      setSession(null);
      return;
    }
    if (initialPath) {
      setSession((current) => adoptPlaybackPath(current, activeModelId, initialPath));
      return;
    }
    setSession((current) => (current && playbackModelMatches(current.modelId, activeModelId) ? current : null));
    if (persist !== "api") return;
    let cancelled = false;
    void fetch(`/api/vnext/projects/${projectId}/models/${activeModelId}/camera-path`)
      .then(async (response) => {
        if (!response.ok || cancelled) return null;
        const body = (await response.json()) as { cameraPath?: TwinCameraPath };
        return body.cameraPath ?? null;
      })
      .then((cameraPath) => {
        if (cancelled || !cameraPath) return;
        setSession((current) => adoptPlaybackPath(current, activeModelId, cameraPath));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeModelId, initialPath, persist, projectId]);

  useEffect(() => {
    if (session?.playback.status !== "playing") return;
    const timer = window.setInterval(() => {
      setSession((current) => {
        if (!current || current.playback.status !== "playing") return current;
        const playback = playbackTick(current.playback, 100, pathPlayDurationMs(current.path), current.path.loop === true);
        return playback === current.playback ? current : { ...current, playback };
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [session?.playback.status, session?.path]);

  useEffect(() => {
    if (!session || session.playback.status !== "playing" || !activeModelId) return;
    if (!playbackModelMatches(session.modelId, activeModelId)) return;
    let cancelled = false;
    const elapsedMs = session.playback.elapsedMs;
    const path = session.path;
    void import("@/lib/digital-twin/camera-path-math").then(({ samplePath }) => {
      if (cancelled) return;
      const sample = samplePath(path, elapsedMs);
      if (!sample) return;
      getHandle()?.setCameraPose({
        position: [sample.position.x, sample.position.y, sample.position.z],
        target: [sample.lookAt.x, sample.lookAt.y, sample.lookAt.z],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeModelId, getHandle, session]);

  const play = useCallback(() => {
    setSession((current) => (current ? { ...current, playback: playbackPlay(current.playback) } : current));
  }, []);
  const pause = useCallback(() => {
    setSession((current) => (current ? { ...current, playback: playbackPause(current.playback) } : current));
  }, []);
  const restart = useCallback(() => {
    setSession((current) => (current ? { ...current, playback: playbackRestart() } : current));
  }, []);
  const setPath = useCallback((path: TwinCameraPath) => {
    setSession((current) => {
      if (!current || (activeModelId && !playbackModelMatches(current.modelId, activeModelId))) return current;
      return { ...current, path };
    });
  }, [activeModelId]);

  const api = useMemo<PlaybackApi>(
    () => ({ session, activeModelId, play, pause, restart, setPath }),
    [session, activeModelId, play, pause, restart, setPath],
  );
  const bound = session && activeModelId && playbackModelMatches(session.modelId, activeModelId);

  return (
    <PlaybackContext.Provider value={api}>
      {bound ? (
        <span
          hidden
          data-vnext-playback={session.playback.status}
          data-vnext-playback-elapsed={session.playback.elapsedMs}
          data-vnext-playback-model={session.modelId}
        />
      ) : null}
      {children}
    </PlaybackContext.Provider>
  );
}
