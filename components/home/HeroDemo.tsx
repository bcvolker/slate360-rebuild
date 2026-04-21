"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Box, Image as ImageIcon, Maximize2, X } from "lucide-react";

const ModelViewerClient = dynamic(
  () => import("@/components/ModelViewerClient"),
  { ssr: false }
);
const PanoramaViewer = dynamic(
  () => import("@/components/home/PanoramaViewer"),
  { ssr: false }
);

type Tab = "model" | "panorama" | "video";

/**
 * HeroDemo — interactive demo on the marketing hero.
 *
 * Layout rules (set after many failed attempts on mobile):
 * - Viewer height is intrinsic (aspect-square on mobile, aspect-[4/3] on
 *   tablet, aspect-video on desktop). Aspect-video on mobile is too short
 *   and cuts the bottom of tall models. Aspect-square gives the model
 *   enough vertical room for its full bounding box.
 * - Expand control is a small icon overlay on the viewer itself, NOT a
 *   button outside the viewer that steals space.
 * - Fullscreen mode uses fixed inset-0 + flex column so it ACTUALLY fills
 *   the screen (previous attempts wrapped it in a centered max-w-5xl
 *   which made it the same size as the inline viewer).
 */
export default function HeroDemo() {
  const [active, setActive] = useState<Tab>("model");
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
    const cameraOrbit = full ? "45deg 65deg 105%" : "45deg 65deg 145%";
    if (active === "model") {
      return (
        <ModelViewerClient
          src="/uploads/csb-stadium-model.glb"
          alt="Stadium 3D model"
          cameraOrbit={cameraOrbit}
          shadowIntensity={1}
          shadowSoftness={1}
        />
      );
    }
    if (active === "panorama") {
      return (
        <PanoramaViewer
          src="/uploads/pletchers.jpg"
          caption={full ? "" : "Drag to look around"}
        />
      );
    }
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Video demo coming soon</p>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 mb-3">
        <TabBtn active={active === "model"}    onClick={() => setActive("model")}    icon={<Box className="h-3.5 w-3.5" />}       label="3D Model" />
        <TabBtn active={active === "panorama"} onClick={() => setActive("panorama")} icon={<ImageIcon className="h-3.5 w-3.5" />} label="360° Tour" />
        <TabBtn active={active === "video"}    onClick={() => setActive("video")}    icon={<Box className="h-3.5 w-3.5" />}       label="Video" />
      </div>

      <div className="relative aspect-square sm:aspect-[4/3] lg:aspect-video max-h-[55vh] sm:max-h-[60vh] lg:max-h-none rounded-lg overflow-hidden bg-background/50">
        {viewer(false)}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Expand viewer"
          className="absolute top-2 right-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border text-foreground hover:bg-background hover:border-cobalt/40 transition-colors shadow-md"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded demo viewer"
          onClick={(e) => {
            // Click outside the viewer body closes — viewer stops propagation below
            if (e.target === e.currentTarget) setExpanded(false);
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-black/60">
            <div className="flex items-center gap-2">
              <TabBtn active={active === "model"}    onClick={() => setActive("model")}    icon={<Box className="h-3.5 w-3.5" />}       label="3D" />
              <TabBtn active={active === "panorama"} onClick={() => setActive("panorama")} icon={<ImageIcon className="h-3.5 w-3.5" />} label="360°" />
              <TabBtn active={active === "video"}    onClick={() => setActive("video")}    icon={<Box className="h-3.5 w-3.5" />}       label="Video" />
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close expanded viewer"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 min-h-0 w-full">{viewer(true)}</div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 backdrop-blur"
          >
            Close (Esc)
          </button>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
        active
          ? "bg-cobalt-soft text-cobalt border border-cobalt"
          : "bg-app-card border border-app text-muted-foreground hover:text-cobalt hover:border-cobalt"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
