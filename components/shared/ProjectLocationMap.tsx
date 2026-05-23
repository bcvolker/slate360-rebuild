"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type ProjectLocationMapProps = {
  compact?: boolean;
  expanded?: boolean;
  className?: string;
};

export default function ProjectLocationMap({
  compact = false,
  expanded = false,
  className,
}: ProjectLocationMapProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-[#A3AED0]",
        compact ? "min-h-[120px]" : "min-h-[220px]",
        expanded && "min-h-[320px]",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <MapPin className="h-5 w-5 text-[#00E699]" />
        <p className="text-sm">Project map loads from geospatial workspace data.</p>
      </div>
    </div>
  );
}
