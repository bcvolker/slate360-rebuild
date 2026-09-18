"use client";

import { useCallback, useRef, useState } from "react";
import { TwinModelViewer } from "@/components/digital-twin/TwinModelViewer";
import { WebglGate } from "@/components/digital-twin/WebglGate";
import type { VnextGeometrySourceData, VnextRealitySourceData } from "@/lib/vnext/explore-types";
import { VnextViewerMediaError } from "./VnextViewerMediaError";

export default function VnextRealityViewer({
  data,
}: {
  data: VnextRealitySourceData | VnextGeometrySourceData;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mediaError, setMediaError] = useState(false);

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
        />
      </div>
    </WebglGate>
  );
}
