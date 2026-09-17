"use client";

import { SplatViewerCore } from "@/components/digital-twin/splat-viewer-core";

export function PayneSplatStage({
  src,
  kicker,
  title,
}: {
  src: string;
  kicker: string;
  title: string;
}) {
  return (
    <div className="relative h-[calc(100dvh-3.5rem)] w-full overflow-hidden lg:h-full">
      <p className="pointer-events-none absolute left-4 top-2 z-20 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--twin360-blue)]">
        {kicker}
      </p>
      <p className="pointer-events-none absolute left-4 top-7 z-20 font-serif text-xl text-[var(--mkt-canvas)]">
        {title}
      </p>
      <SplatViewerCore src={src} className="absolute inset-0 h-full w-full" cameraMode="orbit" />
    </div>
  );
}
