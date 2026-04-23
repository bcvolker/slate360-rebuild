"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Maximize2, X } from "lucide-react";

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
  modelSrc?: string;
  panoramaSrc?: string;
  label?: string;
}

/**
 * AppDemo — app-tile preview viewer. Mirrors HeroDemo's expand pattern
 * exactly so users see ONE consistent fullscreen UI across the marketing
 * page: Maximize2 button top-right; expanded mode = `fixed inset-0`
 * overlay with header X close + Esc-to-close + bottom "Close (Esc)" pill.
 */
export default function AppDemo({ type, modelSrc, panoramaSrc, label }: AppDemoProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        setExpanded(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey, true);
    };
  }, [expanded]);

  const viewer = (full: boolean) => {
    const cameraOrbit = full ? "45deg 60deg 90%" : "45deg 60deg 107%";
    return (
    <>
      {type === "model" && modelSrc && (
        <ModelViewerClient
          src={modelSrc}
          alt={label ?? "3D model"}
          cameraOrbit={cameraOrbit}
          shadowIntensity={1}
          shadowSoftness={1}
        />
      )}
      {type === "panorama" && panoramaSrc && (
        <PanoramaViewer src={panoramaSrc} caption="Drag to look around" />
      )}
      {type === "placeholder" && (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">Demo coming soon</p>
        </div>
      )}
    </>
    );
  };

  const isPlaceholder = type === "placeholder";

  return (
    <div className="relative">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-background/50 border border-border">
        {viewer(false)}
        {!isPlaceholder && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Expand viewer"
            className="absolute top-2 right-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border text-foreground hover:bg-background hover:border-cobalt/40 transition-colors shadow-md"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {label && (
        <p className="text-xs text-muted-foreground text-center mt-2">{label}</p>
      )}

      {expanded && !isPlaceholder && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={`Expanded ${label ?? "demo"} viewer`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setExpanded(false);
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-black/60">
            <span className="text-sm text-foreground/80 truncate">{label ?? "Demo"}</span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close expanded viewer"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-foreground border border-white/20 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 min-h-0 w-full">{viewer(true)}</div>
        </div>
      )}
    </div>
  );
}
