"use client";

import { useEffect, useState } from "react";
import type { useCamera } from "@/lib/hooks/useCamera";

type CameraApi = ReturnType<typeof useCamera>;

type Props = {
  camera: CameraApi;
  captureBlocked: boolean;
  lifecycleRunCount: number;
};

function readDebugEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "1";
}

export function CaptureV2CameraDebugOverlay({ camera, captureBlocked, lifecycleRunCount }: Props) {
  const [debugEnabled, setDebugEnabled] = useState(false);

  useEffect(() => {
    setDebugEnabled(readDebugEnabled());
  }, []);

  if (!debugEnabled) return null;

  const video = camera.videoRef.current;
  const readyState = video?.readyState ?? -1;
  const videoWidth = video?.videoWidth ?? 0;

  const lines = [
    `isStreaming=${String(camera.isStreaming)}`,
    `streamAlive=${String(camera.streamAlive)}`,
    `videoAttached=${String(camera.videoAttached)}`,
    `needsUserResume=${String(camera.needsUserResume)}`,
    `hasLiveFrames=${String(camera.hasLiveFrames)}`,
    `error=${camera.error ?? "null"}`,
    `captureBlocked=${String(captureBlocked)}`,
    `lifecycleRuns=${lifecycleRunCount}`,
    `video.readyState=${readyState}`,
    `videoWidth=${videoWidth}`,
  ];

  return (
    <div
      className="pointer-events-none absolute bottom-2 left-2 z-[60] max-w-[min(100%,16rem)] rounded bg-black/75 px-2 py-1.5 font-mono text-[10px] leading-snug text-emerald-300"
      aria-hidden
    >
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}
