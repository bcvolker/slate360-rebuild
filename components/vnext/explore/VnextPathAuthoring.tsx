"use client";

import { useEffect, useState } from "react";
import type { CameraEasing, CameraKeyframe, TwinCameraPath } from "@/lib/digital-twin/camera-path-types";
import { segmentDurations } from "@/lib/digital-twin/camera-path-math";
import type { SplatViewerHandle } from "@/components/digital-twin/splat-viewer-constants";
import { readLiveView } from "@/lib/vnext/views/live-view";
import { pathDurationMs, playbackPause, playbackPlay, playbackRestart, playbackTick, type PlaybackState } from "@/lib/vnext/views/playback-state";

const DURATIONS = [2000, 4000, 8000];

type Props = {
  modelId: string;
  initialPath: TwinCameraPath;
  canWrite: boolean;
  persist: "local" | "api";
  projectId: string;
  getHandle: () => SplatViewerHandle | null;
};

export function VnextPathAuthoring({ modelId, initialPath, canWrite, persist, projectId, getHandle }: Props) {
  const [path, setPath] = useState(initialPath);
  const [durationMs, setDurationMs] = useState(4000);
  const [easing, setEasing] = useState<CameraEasing>("easeInOut");
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [playback, setPlayback] = useState<PlaybackState>({ status: "idle", elapsedMs: 0 });
  const total = pathDurationMs(segmentDurations(path));

  useEffect(() => {
    if (playback.status !== "playing") return;
    const timer = window.setInterval(() => {
      setPlayback((current) => playbackTick(current, 100, total, path.loop === true));
    }, 100);
    return () => window.clearInterval(timer);
  }, [playback.status, path.loop, total]);

  useEffect(() => {
    if (playback.status !== "playing") return;
    let cancelled = false;
    void import("@/lib/digital-twin/camera-path-math").then(({ samplePath }) => {
      if (cancelled) return;
      const sample = samplePath(path, playback.elapsedMs);
      if (!sample) return;
      getHandle()?.setCameraPose({
        position: [sample.position.x, sample.position.y, sample.position.z],
        target: [sample.lookAt.x, sample.lookAt.y, sample.lookAt.z],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [getHandle, path, playback.elapsedMs, playback.status]);

  const addCurrent = () => {
    const live = readLiveView();
    if (!live || typeof live !== "object" || (live as { kind?: string }).kind !== "camera") {
      setNotice("The camera position is not available from this viewer.");
      return;
    }
    const camera = live as { position: [number, number, number]; lookAt: [number, number, number] };
    const frame: CameraKeyframe = {
      id: `kf-${path.keyframes.length + 1}`,
      position: camera.position,
      lookAt: camera.lookAt,
      durationMs,
      easing,
    };
    setPath((current) => ({ ...current, keyframes: [...current.keyframes, frame] }));
    setNotice(null);
    setSaved(false);
  };

  const save = async () => {
    if (persist === "local") {
      setSaved(true);
      return;
    }
    const response = await fetch(`/api/vnext/projects/${projectId}/models/${modelId}/camera-path`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ modelId, cameraPath: path }),
    });
    setSaved(response.ok);
    if (!response.ok) setNotice("The path could not be saved.");
  };

  return (
    <div className="mt-3 border-t border-[var(--vnext-line)] pt-3" data-vnext-path-authoring={modelId}>
      <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">This path plays on this Reality model only.</p>
      <ul className="m-0 mt-2 list-none p-0">
        {path.keyframes.map((frame, index) => (
          <li key={frame.id} className="py-1 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" data-vnext-keyframe={frame.id}>
            View {index + 1}
          </li>
        ))}
      </ul>
      {canWrite ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="h-11 min-w-[44px] border border-[var(--vnext-line)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" onClick={addCurrent} data-vnext-path-add="true">
            Add current view
          </button>
          <label className="flex h-11 items-center gap-2 text-[length:var(--vnext-meta)] text-[var(--vnext-ink)]">
            Duration
            <select className="h-11 border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-2" value={durationMs} data-vnext-path-duration="true" onChange={(event) => setDurationMs(Number(event.target.value))}>
              {DURATIONS.map((value) => (
                <option key={value} value={value}>
                  {value / 1000} seconds
                </option>
              ))}
            </select>
          </label>
          <label className="flex h-11 items-center gap-2 text-[length:var(--vnext-meta)] text-[var(--vnext-ink)]">
            Easing
            <select className="h-11 border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-2" value={easing} data-vnext-path-easing="true" onChange={(event) => setEasing(event.target.value as CameraEasing)}>
              <option value="linear">Linear</option>
              <option value="easeInOut">Ease</option>
            </select>
          </label>
          <label className="flex h-11 items-center gap-2 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
            <input type="checkbox" checked={path.loop === true} data-vnext-path-loop="true" onChange={(event) => { setPath((current) => ({ ...current, loop: event.target.checked })); setSaved(false); }} />
            Loop
          </label>
          <button type="button" className="h-11 min-w-[44px] border border-[var(--vnext-line)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" onClick={() => void save()} data-vnext-path-save="true">
            Save path
          </button>
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2" data-vnext-playback={playback.status} data-vnext-playback-elapsed={playback.elapsedMs}>
        <button type="button" className="h-11 min-w-[44px] border border-[var(--vnext-line)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" onClick={() => setPlayback((current) => playbackPlay(current))} data-vnext-path-play="true">
          Play
        </button>
        <button type="button" className="h-11 min-w-[44px] border border-[var(--vnext-line)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" onClick={() => setPlayback((current) => playbackPause(current))} data-vnext-path-pause="true">
          Pause
        </button>
        <button type="button" className="h-11 min-w-[44px] border border-[var(--vnext-line)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" onClick={() => setPlayback(playbackRestart())} data-vnext-path-restart="true">
          Restart
        </button>
      </div>
      {notice ? <p className="mt-2 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]" data-vnext-path-notice="true">{notice}</p> : null}
      {saved ? <p className="mt-2 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]" data-vnext-path-saved="true">Saved for this model.</p> : null}
    </div>
  );
}
