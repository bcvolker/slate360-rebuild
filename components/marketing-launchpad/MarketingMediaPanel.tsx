"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { VIEWER_FRAME } from "@/components/marketing-launchpad/marketing-styles";

const ModelViewerClient = dynamic(() => import("@/components/ModelViewerClient"), { ssr: false });
const PanoramaViewer = dynamic(() => import("@/components/home/PanoramaViewer"), { ssr: false });

const SITE_WALK_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const PANORAMA_SRC = "/uploads/pletchers.jpg";
const MODEL_SRC = "/uploads/csb-stadium-model.glb";

type MarketingMediaPanelProps = {
  variant: "hero-model" | "capture" | "maps" | "twin" | "panorama";
};

function ViewerShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(VIEWER_FRAME, "h-full w-full [&>*]:absolute [&>*]:inset-0 [&>*]:h-full [&>*]:w-full")}>
      {children}
    </div>
  );
}

function BlueprintMapPanel() {
  const pins = [
    { top: "22%", left: "28%", label: "Entry" },
    { top: "48%", left: "62%", label: "Core" },
    { top: "70%", left: "38%", label: "West wing" },
  ];

  return (
    <div className="relative h-full w-full bg-[#0B0F15] p-4">
      <div className="absolute inset-4 grid grid-cols-6 grid-rows-4 gap-1 opacity-30">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="border border-white/[0.06]" />
        ))}
      </div>
      {pins.map((pin) => (
        <button
          key={pin.label}
          type="button"
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
          style={{ top: pin.top, left: pin.left }}
          aria-label={`Plan pin: ${pin.label}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00E699]/20 text-xs font-bold text-[#00E699]">
            ●
          </span>
          <span className="text-[10px] font-medium text-[#A3AED0]">{pin.label}</span>
        </button>
      ))}
    </div>
  );
}

export function MarketingMediaPanel({ variant }: MarketingMediaPanelProps) {
  if (variant === "hero-model" || variant === "twin") {
    return (
      <ViewerShell>
        <ModelViewerClient
          src={MODEL_SRC}
          alt="Interactive structural environment twin"
          cameraOrbit="45deg 65deg 107%"
          shadowIntensity={1}
          shadowSoftness={1}
        />
      </ViewerShell>
    );
  }

  if (variant === "capture") {
    return (
      <ViewerShell>
        <video
          className="h-full w-full object-cover"
          src={SITE_WALK_VIDEO}
          autoPlay
          loop
          muted
          playsInline
          aria-label="Site Walk product walkthrough"
        />
      </ViewerShell>
    );
  }

  if (variant === "maps") {
    return (
      <ViewerShell>
        <BlueprintMapPanel />
      </ViewerShell>
    );
  }

  return (
    <ViewerShell>
      <PanoramaViewer src={PANORAMA_SRC} />
    </ViewerShell>
  );
}

export function HeroMediaFrame() {
  return (
    <div className="flex w-full items-center justify-center lg:w-[55%]">
      <MarketingMediaPanel variant="hero-model" />
    </div>
  );
}
