"use client";

import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

export function PhotoExplorerToggle({
  available,
  layerOn,
  onToggle,
  count,
}: {
  available: boolean;
  layerOn: boolean;
  onToggle: () => void;
  count: number;
}) {
  if (!available) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
        layerOn ? twinAccent.button : "border-white/10 text-zinc-400 hover:text-zinc-200",
      )}
      aria-pressed={layerOn}
      title="Toggle camera position markers"
    >
      <Camera className="size-3.5" aria-hidden />
      Photos{count > 0 ? ` (${count})` : ""}
    </button>
  );
}
