"use client";

import dynamic from "next/dynamic";

// model-viewer must be client-only (custom web component) — gives orbit/zoom/pan
// controls and handles Draco/meshopt automatically.
const ModelViewerClient = dynamic(() => import("@/components/ModelViewerClient"), { ssr: false });

/** The interactive 3D viewer for the Design Studio centerpiece. Fills its parent.
 *  `src` is a URL/path to a GLB/GLTF model. */
export function DesignViewer({ src, alt = "Design model" }: { src: string; alt?: string }) {
  return (
    <div className="h-full w-full">
      <ModelViewerClient src={src} alt={alt} interactive scrollInterceptGate={false} />
    </div>
  );
}
