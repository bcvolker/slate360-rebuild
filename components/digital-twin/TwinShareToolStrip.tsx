"use client";

import { Loader2, MapPin, MessageSquare, Orbit, Ruler, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";

export type TwinShareTool = "view" | "pin" | "comment" | "measure";
export type TwinShareCameraMode = "orbit" | "walk";

type Props = {
  tool: TwinShareTool;
  cameraMode: TwinShareCameraMode;
  canAnnotate: boolean;
  measureReady: boolean;
  viewerKind: TwinViewerKind;
  busy: boolean;
  onSelectTool: (tool: TwinShareTool) => void;
  onToggleCameraMode: () => void;
};

export function TwinShareToolStrip({
  tool,
  cameraMode,
  canAnnotate,
  measureReady,
  viewerKind,
  busy,
  onSelectTool,
  onToggleCameraMode,
}: Props) {
  const icons = { view: Orbit, comment: MessageSquare, pin: MapPin, measure: Ruler };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(["view", "comment", "pin", "measure"] as TwinShareTool[]).map((id) => {
        if (id !== "view" && !canAnnotate) return null;
        if (id === "measure" && !measureReady) return null;
        const Icon = icons[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectTool(id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold capitalize transition-colors disabled:opacity-40",
              tool === id ? twinAccent.button : "border-white/10 text-zinc-400 hover:text-zinc-200",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {id}
          </button>
        );
      })}
      {viewerKind === "splat" ? (
        <button
          type="button"
          onClick={onToggleCameraMode}
          className={cn(twinAccent.button, "inline-flex items-center gap-1 text-[11px]")}
        >
          {cameraMode === "orbit" ? (
            <Footprints className="size-3.5" aria-hidden />
          ) : (
            <Orbit className="size-3.5" aria-hidden />
          )}
          {cameraMode === "orbit" ? "Walk" : "Orbit"}
        </button>
      ) : null}
      {busy ? <Loader2 className={cn("size-4 animate-spin", twinAccent.spinner)} aria-hidden /> : null}
    </div>
  );
}
