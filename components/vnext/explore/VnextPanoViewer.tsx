"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { registerLiveView } from "@/lib/vnext/views/live-view";
import { TourPanoViewer } from "@/components/tours/TourPanoViewer";
import type { VnextPanoSourceData } from "@/lib/vnext/explore-types";
import { VnextViewerMediaError } from "./VnextViewerMediaError";

export default function VnextPanoViewer({
  data,
  yaw = 0,
  pitch = 0,
}: {
  data: VnextPanoSourceData;
  yaw?: number;
  pitch?: number;
}) {
  const pose = useRef({ yaw, pitch });
  const [mediaError, setMediaError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    pose.current = { yaw, pitch };
    return registerLiveView(() => ({ kind: "pano", yaw: pose.current.yaw, pitch: pose.current.pitch }));
  }, [yaw, pitch]);

  const retry = useCallback(() => {
    setMediaError(false);
    setRetryAttempt((n) => n + 1);
  }, []);

  const onPosition = useCallback((nextYaw: number, nextPitch: number) => {
    pose.current = { yaw: nextYaw, pitch: nextPitch };
  }, []);

  if (mediaError) {
    return (
      <div className="relative h-full w-full">
        <VnextViewerMediaError onRetry={retry} />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <TourPanoViewer
        key={retryAttempt}
        src={retryAttempt > 0 ? `${data.imageUrl}?retry=${retryAttempt}` : data.imageUrl}
        initialYaw={yaw}
        initialPitch={pitch}
        onPositionChange={onPosition}
        onError={() => setMediaError(true)}
      />
      <span className="sr-only" data-vnext-pano-yaw={yaw} data-vnext-pano-pitch={pitch} />
    </div>
  );
}
