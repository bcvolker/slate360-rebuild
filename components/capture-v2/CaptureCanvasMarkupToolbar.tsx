"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Circle,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { VECTOR_TOOL_EVENT, type VectorTool } from "@/components/site-walk/capture/UnifiedVectorToolbar";
import {
  PHOTO_MARKUP_REDO_EVENT,
  PHOTO_MARKUP_UNDO_EVENT,
} from "@/components/site-walk/capture/useMarkupCanvasState";
import {
  CAPTURE_CANVAS_MARKUP_COLORS,
  readCaptureMarkupColor,
  writeCaptureMarkupColor,
} from "./capture-canvas-markup-colors";

const TOOLS = [
  { label: "Select", value: "select", icon: MousePointer2 },
  { label: "Draw", value: "draw", icon: Pencil },
  { label: "Box", value: "box", icon: Square },
  { label: "Circle", value: "circle", icon: Circle },
  { label: "Arrow", value: "arrow", icon: ArrowUpRight },
  { label: "Text", value: "text", icon: Type },
] as const;

function publish(tool: VectorTool, color: string, strokeWidth: number, deleteSelected = false) {
  window.dispatchEvent(
    new CustomEvent(VECTOR_TOOL_EVENT, { detail: { tool, color, strokeWidth, deleteSelected } }),
  );
}

export function CaptureCanvasMarkupToolbar({
  hidden,
  onClose,
}: {
  hidden?: boolean;
  onClose?: () => void;
}) {
  const [activeTool, setActiveTool] = useState<VectorTool>("draw");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [activeColor, setActiveColor] = useState(readCaptureMarkupColor);

  useEffect(() => {
    publish(activeTool, activeColor, strokeWidth);
  }, [activeColor, activeTool, strokeWidth]);

  if (hidden) return null;

  return (
    <div
      data-capture-chrome="markup-toolbar"
      className="pointer-events-auto flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_78%,transparent)] p-1 backdrop-blur-md no-scrollbar"
      role="toolbar"
      aria-label="Markup tools"
    >
      {onClose ? (
        <>
          <button
            type="button"
            onClick={onClose}
            data-capture-chrome="markup-done"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg bg-[var(--graphite-primary)] px-2.5 text-[11px] font-semibold text-[var(--graphite-canvas)] transition active:scale-[0.98]"
            aria-label="Done with markup"
          >
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Done
          </button>
          <div className="mx-0.5 h-7 w-px shrink-0 bg-[var(--mobile-app-card-border)]" />
        </>
      ) : null}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(PHOTO_MARKUP_UNDO_EVENT))}
        data-capture-chrome="markup-undo"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        aria-label="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(PHOTO_MARKUP_REDO_EVENT))}
        data-capture-chrome="markup-redo"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        aria-label="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </button>
      <div className="mx-0.5 h-7 w-px shrink-0 bg-[var(--mobile-app-card-border)]" />
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const active = activeTool === tool.value;
        return (
          <button
            key={tool.value}
            type="button"
            onClick={() => {
              setActiveTool(tool.value);
              publish(tool.value, activeColor, strokeWidth);
            }}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
              active
                ? "border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-primary)]"
                : "border-transparent text-[var(--graphite-muted)] hover:text-[var(--graphite-text-body)]"
            }`}
            aria-label={tool.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => publish(activeTool, activeColor, strokeWidth, true)}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        aria-label="Delete selected"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <div className="mx-0.5 h-7 w-px shrink-0 bg-[var(--mobile-app-card-border)]" />
      {CAPTURE_CANVAS_MARKUP_COLORS.map((entry) => {
        const selected = activeColor === entry.value;
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => {
              setActiveColor(entry.value);
              writeCaptureMarkupColor(entry.value);
              publish(activeTool, entry.value, strokeWidth);
            }}
            className={`inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full ring-2 ring-offset-1 ring-offset-transparent transition ${
              selected ? "ring-[var(--graphite-text-header)]" : "ring-transparent"
            }`}
            aria-label={entry.label}
            aria-pressed={selected}
          >
            <span className="block h-full w-full rounded-full" style={{ backgroundColor: entry.value }} />
          </button>
        );
      })}
      <div className="ml-0.5 flex shrink-0 gap-1 border-l border-[var(--mobile-app-card-border)] pl-1">
        {[3, 5, 8].map((width) => (
          <button
            key={width}
            type="button"
            onClick={() => {
              setStrokeWidth(width);
              publish(activeTool, activeColor, width);
            }}
            className={`h-7 min-w-7 rounded-md px-1 text-[10px] font-semibold tabular-nums ${
              strokeWidth === width
                ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-primary)]"
                : "text-[var(--graphite-muted)]"
            }`}
          >
            {width}
          </button>
        ))}
      </div>
    </div>
  );
}
