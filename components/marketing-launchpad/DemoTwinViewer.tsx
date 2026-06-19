"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

/**
 * Public, self-contained interactive 3D twin for marketing pages. Loads a
 * Gaussian-splat model entirely client-side (no auth, no backend), so anyone
 * can orbit/explore it. Swap `src` for a real Slate360 twin model URL when
 * ready — no other changes needed.
 */
const DEFAULT_DEMO_SRC = "/marketing/sample-twin.spz";

const SplatViewer = dynamic(() => import("@/components/digital-twin/SplatViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0B0F15] text-[#A3AED0]">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> Loading 3D model…
    </div>
  ),
});

export function DemoTwinViewer({ src = DEFAULT_DEMO_SRC }: { src?: string }) {
  return (
    <div className="absolute inset-0">
      <SplatViewer src={src} className="h-full w-full" />
      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-black/55 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
        Sample model — drag to orbit, scroll to zoom
      </span>
    </div>
  );
}
