"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    const cameraOrbit = full ? "45deg 65deg 90%" : "45deg 65deg 107%";
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

      <div className="relative aspect-video sm:aspect-[4/3] lg:aspect-video max-h-[36vh] sm:max-h-[44vh] lg:max-h-none rounded-lg overflow-hidden bg-background/50">
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

      {mounted && expanded && createPortal(
        <div
          className="fixed inset-0 z-[1000] h-[100dvh] w-screen bg-black/95 backdrop-blur flex flex-col isolate"
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
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-950 hover:bg-slate-200 border-2 border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.22)] transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 min-h-0 w-full overflow-hidden">{viewer(true)}</div>
        </div>,
        document.body,
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
          ? "bg-slate-900 text-blue-400 border border-blue-500 shadow-sm"
          : "bg-slate-900/60 border border-slate-700 text-slate-300 hover:text-blue-400 hover:border-blue-500 hover:bg-slate-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
