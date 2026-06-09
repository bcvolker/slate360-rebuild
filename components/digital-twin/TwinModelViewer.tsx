"use client";

import dynamic from "next/dynamic";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

const SplatViewer = dynamic(() => import("@/components/digital-twin/SplatViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl bg-white/[0.03] text-xs text-zinc-400">
      Preparing viewer…
    </div>
  ),
});

const ModelViewerClient = dynamic(() => import("@/components/ModelViewerClient"), {
  ssr: false,
});

const TourPanoViewer = dynamic(
  () => import("@/components/tours/TourPanoViewer").then((m) => m.TourPanoViewer),
  { ssr: false },
);

export function TwinModelViewer({
  viewerKind,
  modelUrl,
  modelTitle,
}: {
  viewerKind: TwinViewerKind;
  modelUrl: string;
  modelTitle: string;
}) {
  if (viewerKind === "splat") {
    return <SplatViewer src={modelUrl} className="absolute inset-0" />;
  }

  if (viewerKind === "model") {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <ModelViewerClient
          src={modelUrl}
          alt={modelTitle}
          interactive
          scrollInterceptGate={false}
        />
      </div>
    );
  }

  if (viewerKind === "pano") {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <TourPanoViewer src={modelUrl} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 border border-white/[0.08] bg-white/[0.03] px-4 text-center">
      <AlertTriangle className={cn("size-7", twinAccent.text)} aria-hidden />
      <p className="text-sm font-medium text-zinc-200">Viewer not available for this format yet</p>
      <p className="text-xs text-zinc-500">This model type will be supported in a future update.</p>
    </div>
  );
}
