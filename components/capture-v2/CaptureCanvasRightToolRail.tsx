"use client";

import { MapPin, Pencil, Plus } from "lucide-react";
import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { CAPTURE_V2_LAYERS } from "./layers";

type Tool = "markup" | "pin" | "angle";

type Props = {
  hidden?: boolean;
  activeTool: Tool | null;
  onSelectTool: (tool: Tool) => void;
};

function glassButtonClass(active: boolean) {
  return active
    ? "border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-primary)]"
    : "border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] text-[var(--graphite-text-header)]";
}

export function CaptureCanvasRightToolRail({ hidden, activeTool, onSelectTool }: Props) {
  if (hidden) return null;

  const top = `max(calc(${CAPTURE_CANVAS_CHROME.toolRailTopPx}px + env(safe-area-inset-top)), ${CAPTURE_CANVAS_CHROME.toolRailTopPx}px)`;

  return (
    <div
      className={`${CAPTURE_V2_LAYERS.fastTrack} pointer-events-auto absolute z-30 flex flex-col gap-3`}
      style={{
        right: CAPTURE_CANVAS_CHROME.toolRailRightPx,
        top,
      }}
      role="toolbar"
      aria-label="Capture tools"
    >
      {(
        [
          { id: "markup" as const, label: "Markup", icon: Pencil },
          { id: "pin" as const, label: "Pin", icon: MapPin },
          { id: "angle" as const, label: "+ Angle", icon: Plus },
        ] as const
      ).map((entry) => (
        <div key={entry.id} className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectTool(entry.id)}
            className={`inline-flex items-center justify-center rounded-xl border backdrop-blur-md transition active:scale-[0.98] ${glassButtonClass(activeTool === entry.id)}`}
            style={{
              width: CAPTURE_CANVAS_CHROME.toolRailButtonPx,
              height: CAPTURE_CANVAS_CHROME.toolRailButtonPx,
            }}
            aria-pressed={activeTool === entry.id}
          >
            <entry.icon className="h-5 w-5" />
          </button>
          <span className="text-[11px] font-medium leading-none text-[var(--graphite-muted)]">
            {entry.label}
          </span>
        </div>
      ))}
    </div>
  );
}
