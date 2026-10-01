"use client";

import { forwardRef } from "react";
import { SplatViewerCore } from "@/components/digital-twin/splat-viewer-core";
import type { SplatViewerHandle } from "@/components/digital-twin/splat-viewer-constants";

const SplatViewer = forwardRef<SplatViewerHandle, { src: string; className?: string }>(function SplatViewer({ src, className }, ref) {
  return <SplatViewerCore ref={ref} src={src} className={className} />;
});

export default SplatViewer;
