"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { LidarPointCloudViewer } from "./lidar/LidarPointCloudViewer";

export function TwinShareLidarLayerSwitcher({
  visual,
  shareToken,
  lidarModelId,
}: {
  visual: ReactNode;
  shareToken: string;
  lidarModelId: string;
}) {
  const [active, setActive] = useState<"model" | "lidar">("model");
  return (
    <div className="relative h-full min-h-0 w-full">
      <div className={cn("absolute inset-0", active === "model" ? "z-0" : "invisible z-[-1]")}>{visual}</div>
      <div className={cn("absolute inset-0", active === "lidar" ? "z-0" : "invisible z-[-1]")}>
        <LidarPointCloudViewer
          baseUrl={`/api/share/twin/${shareToken}/lidar`}
          modelId={lidarModelId}
        />
      </div>
      <div className="pointer-events-auto absolute left-1/2 top-3 z-30 flex -translate-x-1/2 gap-1 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] p-1 backdrop-blur-md">
        <button type="button" onClick={() => setActive("model")} className={cn("rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide", active === "model" ? twinAccent.button : "text-zinc-400")}>3D</button>
        <button type="button" onClick={() => setActive("lidar")} className={cn("rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide", active === "lidar" ? twinAccent.button : "text-zinc-400")}>LiDAR</button>
      </div>
    </div>
  );
}
