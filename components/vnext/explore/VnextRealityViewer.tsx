"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TwinModelViewer } from "@/components/digital-twin/TwinModelViewer";
import { WebglGate } from "@/components/digital-twin/WebglGate";
import type { SplatViewerHandle } from "@/components/digital-twin/splat-viewer-constants";
import type { VnextGeometrySourceData, VnextRealitySourceData } from "@/lib/vnext/explore-types";
import { registerLiveView } from "@/lib/vnext/views/live-view";
import type { SavedCameraState } from "@/lib/vnext/views/saved-view-types";
import { VnextViewerMediaError } from "./VnextViewerMediaError";

export default function VnextRealityViewer({
  data,
  restoreCamera = null,
  onSplatHandle,
}: {
  data: VnextRealitySourceData | VnextGeometrySourceData;
  restoreCamera?: SavedCameraState | null;
  onSplatHandle?: (handle: SplatViewerHandle | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SplatViewerHandle | null>(null);
  const [mediaError, setMediaError] = useState(false);
  const setHandle = useCallback((handle: SplatViewerHandle | null) => {
    handleRef.current = handle;
    onSplatHandle?.(handle);
  }, [onSplatHandle]);

  useEffect(() => {
    return registerLiveView(() => {
      if (data.viewerKind !== "splat") return null;
      const pose = handleRef.current?.getCameraPose();
      if (!pose) return null;
      return { kind: "camera", position: pose.position, lookAt: pose.target };
    });
  }, [data.viewerKind]);

  useEffect(() => {
    if (data.viewerKind !== "splat" || !restoreCamera) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const handle = handleRef.current;
      if (!handle?.getCameraPose()) {
        if (Date.now() - started > 8000) window.clearInterval(timer);
        return;
      }
      handle.setCameraPose({ position: restoreCamera.position, target: restoreCamera.lookAt });
      window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [data.viewerKind, restoreCamera]);

  // Reality (splat) already has its own mature error/retry UI (SplatViewer's ErrorCard) — this only
  // covers Geometry: <model-viewer> (components/ModelViewerClient.tsx) has no error handling of its
  // own today. Its native "error" event doesn't bubble, so it's caught here with a capture-phase
  // listener on the wrapping container rather than needing to modify the shared component.
  const onErrorCapture = useCallback(() => {
    if (data.viewerKind === "model") setMediaError(true);
  }, [data.viewerKind]);

  if (mediaError) {
    // The resolved modelUrl is a presigned S3 link, not a re-signing proxy — a genuine retry needs
    // a fresh signature from the server, which a reload gets honestly.
    return (
      <div className="relative h-full w-full">
        <VnextViewerMediaError onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <WebglGate>
      <div ref={containerRef} className="relative h-full w-full" onErrorCapture={onErrorCapture}>
        <TwinModelViewer
          viewerKind={data.viewerKind}
          modelUrl={data.modelUrl}
          modelTitle={data.modelTitle}
          onSplatHandle={data.viewerKind === "splat" ? setHandle : undefined}
        />
      </div>
    </WebglGate>
  );
}
