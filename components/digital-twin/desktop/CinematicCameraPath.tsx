"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconDeviceFloppy,
  IconLoader2,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconPlus,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { CameraKeyframe, TwinCameraPath } from "@/lib/digital-twin/camera-path-types";
import { segmentDurations } from "@/lib/digital-twin/camera-path-math";
import { CinematicSplatViewport } from "./CinematicSplatViewport";

type Props = {
  spaceId: string;
  spaceTitle: string;
  modelId: string;
  modelTitle: string;
  modelUrl: string;
  initialPath: TwinCameraPath;
};

function defaultKeyframe(index: number): CameraKeyframe {
  const angle = index * 0.8;
  return {
    id: crypto.randomUUID(),
    position: [Math.sin(angle) * 3, 1.5, Math.cos(angle) * 3],
    lookAt: [0, 0, 0],
    durationMs: 2500,
    easing: index % 2 === 0 ? "easeInOut" : "slowMo",
  };
}

export function CinematicCameraPath({
  spaceId,
  spaceTitle,
  modelId,
  modelTitle,
  modelUrl,
  initialPath,
}: Props) {
  const [path, setPath] = useState<TwinCameraPath>(initialPath);
  const [scrubMs, setScrubMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [grabbed, setGrabbed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalMs = useMemo(() => segmentDurations(path).reduce((a, b) => a + b, 0), [path]);

  const addKeyframe = () => {
    setPath((p) => ({
      ...p,
      keyframes: [...p.keyframes, defaultKeyframe(p.keyframes.length)],
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/digital-twin/models/${modelId}/camera-path`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_path: path }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const exportMp4 = () => {
    // TODO: server-render MP4 via Trigger.dev; client path uses WebCodecs/CCapture when available.
    setError("MP4 export: server-render pipeline not wired yet. Use screen capture for now.");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-100">{spaceTitle}</p>
          <p className="text-xs text-zinc-500">{modelTitle} · Cinematic path</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/digital-twin/twins/${spaceId}`} className={cn("text-xs", twinAccent.link)}>
            Viewer
          </Link>
          <button type="button" onClick={addKeyframe} className={twinAccent.button}>
            <IconPlus className="mr-1 inline size-3.5" aria-hidden />
            Keyframe
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className={cn(twinAccent.button, "inline-flex items-center gap-1")}
          >
            {saving ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconDeviceFloppy className="size-3.5" />}
            Save
          </button>
        </div>
      </div>

      <CinematicSplatViewport
        src={modelUrl}
        path={path}
        playing={playing && !grabbed}
        scrubMs={scrubMs}
        userGrabbed={grabbed}
        onScrub={setScrubMs}
        onUserGrab={() => {
          setGrabbed(true);
          setPlaying(false);
        }}
      />

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            className={twinAccent.button}
            onClick={() => {
              setGrabbed(false);
              setPlaying((p) => !p);
            }}
          >
            {playing && !grabbed ? (
              <IconPlayerPause className="size-4" aria-hidden />
            ) : (
              <IconPlayerPlay className="size-4" aria-hidden />
            )}
          </button>
          {grabbed ? (
            <button
              type="button"
              className={twinAccent.button}
              onClick={() => {
                setGrabbed(false);
                setPlaying(true);
              }}
            >
              <IconPlayerSkipForward className="size-4" aria-hidden />
              Resume path
            </button>
          ) : null}
          <input
            type="range"
            min={0}
            max={Math.max(totalMs, 1)}
            value={Math.min(scrubMs, totalMs)}
            onChange={(e) => {
              setScrubMs(Number(e.target.value));
              setPlaying(false);
            }}
            className="min-w-0 flex-1 accent-[var(--twin360-blue)]"
            aria-label="Scrub timeline"
          />
          <button type="button" onClick={exportMp4} className={twinAccent.button}>
            Export MP4
          </button>
        </div>
        <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-zinc-400">
          {path.keyframes.map((kf, i) => (
            <li key={kf.id}>
              KF {i + 1}: {kf.durationMs}ms · {kf.easing} · pos [{kf.position.map((n) => n.toFixed(1)).join(", ")}]
            </li>
          ))}
        </ul>
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
