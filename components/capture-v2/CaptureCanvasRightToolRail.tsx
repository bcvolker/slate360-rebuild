"use client";

import { Pencil, Plus } from "lucide-react";
import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { captureCanvasGlass } from "./capture-canvas-glass-tokens";
import { CAPTURE_V2_LAYERS } from "./layers";

type Tool = "markup" | "angle";

type Props = {
  hidden?: boolean;
  activeTool: Tool | null;
  onSelectTool: (tool: Tool) => void;
};

function glassButtonClass(active: boolean) {
  return active
    ? "border-[var(--accent-border-green)] bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] ring-2 ring-[var(--accent-border-green)]"
    : "border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--graphite-primary)_12%,var(--graphite-canvas))] text-[var(--graphite-primary)]";
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
        maxWidth: CAPTURE_CANVAS_CHROME.toolRailButtonPx,
      }}
      role="toolbar"
      aria-label="Capture tools"
      data-capture-chrome="right-tool-rail"
    >
      {(
        [
          { id: "markup" as const, label: "Markup", icon: Pencil },
          { id: "angle" as const, label: "+Angle", icon: Plus },
        ] as const
      ).map((entry) => (
        <div key={entry.id} className="flex w-full flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectTool(entry.id)}
            className={`inline-flex items-center justify-center rounded-xl border backdrop-blur-md transition active:scale-[0.98] ${glassButtonClass(activeTool === entry.id)}`}
            style={{
              width: CAPTURE_CANVAS_CHROME.toolRailButtonPx,
              height: CAPTURE_CANVAS_CHROME.toolRailButtonPx,
            }}
            aria-pressed={activeTool === entry.id}
            aria-label={entry.label}
          >
            <entry.icon className="h-5 w-5" />
          </button>
          <span
            className={`${captureCanvasGlass.labelChip} w-full max-w-[52px] truncate text-[10px] font-medium leading-none text-[var(--graphite-muted)]`}
          >
            {entry.label}
          </span>
        </div>
      ))}
    </div>
  );
}
