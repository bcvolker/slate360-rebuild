"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { VIEWER_DISCOVERY_HINT_MS } from "@/components/digital-twin/splat-viewer-constants";

export function TwinViewerDiscoveryHint({ className }: { className?: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(false), VIEWER_DISCOVERY_HINT_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <p
      className={cn(
        "pointer-events-none text-center text-[11px] font-medium leading-relaxed text-[var(--graphite-muted)] transition-opacity duration-700",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      drag to orbit · double-tap to walk inside
    </p>
  );
}
