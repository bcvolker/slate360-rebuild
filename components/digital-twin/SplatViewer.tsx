"use client";

import { SplatViewerCore } from "@/components/digital-twin/splat-viewer-core";

export default function SplatViewer({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return <SplatViewerCore src={src} className={className} />;
}
