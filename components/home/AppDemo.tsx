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

  if (type === "placeholder") {
    return (
      <div className="relative">
        <div className="rounded-lg overflow-hidden bg-background/50 border border-border aspect-video">
          {viewer}
        </div>
        {label && (
          <p className="text-xs text-muted-foreground text-center mt-2">{label}</p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Inline preview */}
      <button
        onClick={() => setExpanded(true)}
        className="w-full text-left"
        aria-label="Expand demo"
      >
        <div className="rounded-lg overflow-hidden bg-background/50 border border-border aspect-video relative group cursor-pointer">
          {viewer}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border">
              <Maximize2 className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      </button>

      {label && (
        <p className="text-xs text-muted-foreground text-center mt-2">{label}</p>
      )}

      {/* Full-screen expanded overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative w-full max-w-5xl aspect-video rounded-xl overflow-hidden border border-primary/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {viewer}
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition-all"
              aria-label="Close expanded view"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
