"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Maximize2, Minimize2 } from "lucide-react";

const ModelViewerClient = dynamic(
  () => import("@/components/ModelViewerClient"),
  { ssr: false }
);
const PanoramaViewer = dynamic(
  () => import("@/components/home/PanoramaViewer"),
  { ssr: false }
);

export type DemoType = "panorama" | "model" | "placeholder";

interface AppDemoProps {
  type: DemoType;
  /** Path to GLB file for "model" type */
  modelSrc?: string;
  /** Path to panorama image for "panorama" type */
  panoramaSrc?: string;
  /** Label shown under the demo */
  label?: string;
}

export default function AppDemo({ type, modelSrc, panoramaSrc, label }: AppDemoProps) {
  const [expanded, setExpanded] = useState(false);

  const viewer = (
    <>
      {type === "model" && modelSrc && (
        <ModelViewerClient
          src={modelSrc}
          alt={label ?? "3D model"}
          cameraOrbit="45deg 60deg 105%"
          shadowIntensity={1}
          shadowSoftness={1}
        />
      )}
      {type === "panorama" && panoramaSrc && (
        <PanoramaViewer
          src={panoramaSrc}
          caption="Drag to look around"
        />
      )}
      {type === "placeholder" && (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">Demo coming soon</p>
        </div>
      )}
    </>
  );

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-background/70 backdrop-blur-sm border border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition-all"
        aria-label={expanded ? "Collapse demo" : "Expand demo"}
      >
        {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>

      {/* Demo area with consistent aspect ratio that expands */}
      <div
        className={`rounded-lg overflow-hidden bg-background/50 border border-border transition-all duration-300 ${
          expanded ? "aspect-[16/10]" : "aspect-video"
        }`}
      >
        {viewer}
      </div>

      {label && (
        <p className="text-xs text-muted-foreground text-center mt-2">{label}</p>
      )}
    </div>
  );
}
