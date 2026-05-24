"use client";

import dynamic from "next/dynamic";
const ModelViewerClient = dynamic(() => import("@/components/ModelViewerClient"), { ssr: false });
const PanoramaViewer = dynamic(() => import("@/components/marketing-launchpad/PanoramaViewer"), {
  ssr: false,
});

const SITE_WALK_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const PANORAMA_SRC = "/uploads/pletchers.jpg";
const MODEL_SRC = "/uploads/csb-stadium-model.glb";

export type MarketingMediaVariant = "hero-model" | "capture" | "maps" | "twin" | "panorama";

type MarketingMediaPanelProps = {
  variant: MarketingMediaVariant;
  mode?: "default" | "preview" | "fullscreen";
  sizeTier?: "hero" | "tile";
};

const UNIFIED_MEDIA_FRAME =
  "w-full max-w-[540px] aspect-[16/10] bg-slate-900/40 border border-white/[0.08] rounded-xl relative flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(0,230,153,0.01)] lg:justify-self-end";

function ViewerShell({ children }: { children: React.ReactNode }) {
  return <div className={UNIFIED_MEDIA_FRAME}>{children}</div>;
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

function MediaContent({ variant }: { variant: MarketingMediaVariant }) {
  if (variant === "hero-model" || variant === "twin") {
    return (
      <ModelViewerClient
        src={MODEL_SRC}
        alt="Interactive structural environment twin"
        cameraOrbit="45deg 65deg 107%"
        shadowIntensity={1}
        shadowSoftness={1}
      />
    );
  }

  if (variant === "capture") {
    return (
      <video
        className="h-full w-full object-cover"
        src={SITE_WALK_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        aria-label="Site Walk product walkthrough"
      />
    );
  }

  if (variant === "maps") {
    return <BlueprintMapPanel />;
  }

  return <PanoramaViewer src={PANORAMA_SRC} />;
}

export function MarketingMediaPanel({
  variant,
  mode = "default",
  sizeTier = "tile",
}: MarketingMediaPanelProps) {
  return (
    <ViewerShell>
      <MediaContent variant={variant} />
    </ViewerShell>
  );
}
