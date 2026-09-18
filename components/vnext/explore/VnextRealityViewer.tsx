"use client";

import { TwinModelViewer } from "@/components/digital-twin/TwinModelViewer";
import { WebglGate } from "@/components/digital-twin/WebglGate";
import type { VnextGeometrySourceData, VnextRealitySourceData } from "@/lib/vnext/explore-types";

export default function VnextRealityViewer({
  data,
}: {
  data: VnextRealitySourceData | VnextGeometrySourceData;
}) {
  return (
    <WebglGate>
      <div className="relative h-full w-full">
        <TwinModelViewer
          viewerKind={data.viewerKind}
          modelUrl={data.modelUrl}
          modelTitle={data.modelTitle}
        />
      </div>
    </WebglGate>
  );
}
