"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Box, Loader2 } from "lucide-react";

/**
 * Public, self-contained interactive 3D twin for marketing pages. Loads a
 * Gaussian-splat model entirely client-side (no auth, no backend), so anyone
 * can orbit/explore it. Swap `src` for a real Slate360 twin model URL when
 * ready — no other changes needed.
 *
 * A poster image shows instantly while the model streams and is the fallback
 * on devices without WebGL (where the heavy viewer can't render).
 */
const DEFAULT_DEMO_SRC = "/marketing/sample-twin.spz";
const DEFAULT_POSTER = "/marketing/demo/twin-1-record.png";

const SplatViewer = dynamic(() => import("@/components/digital-twin/SplatViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0B0F15] text-[#A3AED0]">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> Loading 3D model…
    </div>
  ),
});

function detectWebgl(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function DemoTwinViewer({
  src = DEFAULT_DEMO_SRC,
  poster = DEFAULT_POSTER,
}: {
  src?: string;
  poster?: string;
}) {
  // null = undetermined (SSR / first paint); avoids mounting WebGL until known.
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => setWebgl(detectWebgl()), []);

  return (
    <div className="absolute inset-0">
      {/* Poster: instant visual, and the fallback when WebGL is unavailable. */}
      {poster ? (
        <Image src={poster} alt="3D twin preview" fill sizes="(max-width: 1024px) 100vw, 720px" className="object-cover" priority />
      ) : null}

      {webgl ? (
        <div className="absolute inset-0">
          <SplatViewer src={src} className="h-full w-full" />
          <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-black/55 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
            Sample model — drag to orbit, scroll to zoom
          </span>
        </div>
      ) : webgl === false ? (
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
            <Box className="h-3.5 w-3.5" aria-hidden /> Interactive 3D — open on a desktop browser to explore
          </span>
        </div>
      ) : null}
    </div>
  );
}
