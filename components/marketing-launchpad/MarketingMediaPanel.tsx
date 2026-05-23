"use client";

import dynamic from "next/dynamic";
import { Camera, Globe2, MapPin, Orbit } from "lucide-react";
import { cn } from "@/lib/utils";
import { GLASS_MEDIA_FRAME, MOBILE_MEDIA_FRAME } from "@/components/marketing-launchpad/marketing-styles";

const ModelViewerClient = dynamic(() => import("@/components/ModelViewerClient"), { ssr: false });

type MarketingMediaPanelProps = {
  variant: "hero-model" | "capture" | "maps" | "twin" | "panorama";
  className?: string;
};

const PANEL_COPY = {
  capture: { icon: Camera, label: "Mobile field capture workspace" },
  maps: { icon: MapPin, label: "Interactive plan pin mapping" },
  twin: { icon: Orbit, label: "Digital twin 3D environment" },
  panorama: { icon: Globe2, label: "360° panoramic traversal" },
} as const;

function IllustrationPanel({ variant }: { variant: keyof typeof PANEL_COPY }) {
  const { icon: Icon, label } = PANEL_COPY[variant];
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900/80 via-[#0B0F15] to-slate-900/60 p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#00E699]/20 bg-[#00E699]/10">
        <Icon className="h-8 w-8 text-[#00E699]" aria-hidden />
      </div>
      <p className="max-w-xs text-center text-sm text-[#A3AED0]">{label}</p>
    </div>
  );
}

export function MarketingMediaPanel({ variant, className }: MarketingMediaPanelProps) {
  const frameClass = cn(MOBILE_MEDIA_FRAME, className);

  if (variant === "hero-model" || variant === "twin") {
    return (
      <div className={frameClass}>
        <ModelViewerClient
          src="/uploads/csb-stadium-model.glb"
          alt="Interactive structural environment twin"
          cameraOrbit="45deg 65deg 107%"
          shadowIntensity={1}
          shadowSoftness={1}
        />
      </div>
    );
  }

  return (
    <div className={frameClass}>
      <IllustrationPanel variant={variant} />
    </div>
  );
}

export function HeroMediaFrame() {
  return (
    <div className="flex w-full flex-1 items-center justify-center lg:w-[60%]">
      <div className={cn(GLASS_MEDIA_FRAME, "aspect-[4/3] min-h-[280px] lg:aspect-auto lg:min-h-[420px]")}>
        <ModelViewerClient
          src="/uploads/csb-stadium-model.glb"
          alt="Interactive structural environment twin"
          cameraOrbit="45deg 65deg 107%"
          shadowIntensity={1}
          shadowSoftness={1}
        />
      </div>
    </div>
  );
}
