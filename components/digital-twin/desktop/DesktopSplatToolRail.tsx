"use client";

import {
  IconArrowsMove,
  IconArrowsUpDown,
  IconCrop,
  IconEraser,
  IconLayersSubtract,
  IconPointer,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { TwinEditTool } from "@/lib/digital-twin/edit-list-types";

export type DesktopSplatTool = TwinEditTool | "select" | "sweep";

const TOOLS: { id: DesktopSplatTool; label: string; icon: typeof IconCrop }[] = [
  { id: "select", label: "Navigate", icon: IconPointer },
  { id: "crop", label: "Crop", icon: IconCrop },
  { id: "slice", label: "Slice", icon: IconLayersSubtract },
  { id: "erase", label: "Erase", icon: IconEraser },
  { id: "transform", label: "Transform", icon: IconArrowsMove },
  { id: "sweep", label: "Sweep reveal", icon: IconArrowsUpDown },
];

export function DesktopSplatToolRail({
  activeTool,
  onToolChange,
  disabled,
}: {
  activeTool: DesktopSplatTool;
  onToolChange: (tool: DesktopSplatTool) => void;
  disabled?: boolean;
}) {
  return (
    <aside
      className="flex w-14 shrink-0 flex-col items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3"
      aria-label="Splat edit tools"
    >
      {TOOLS.map(({ id, label, icon: Icon }) => {
        const active = activeTool === id;
        return (
          <button
            key={id}
            type="button"
            title={label}
            disabled={disabled}
            onClick={() => onToolChange(id)}
            className={cn(
              "flex size-10 items-center justify-center rounded-lg border transition-colors",
              active ? twinAccent.button : "border-transparent text-zinc-400 hover:text-zinc-200",
            )}
          >
            <Icon className="size-5" aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </aside>
  );
}
