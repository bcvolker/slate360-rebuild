"use client";

import { ThermalStudioWorkView, type StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";
import type { ThermalJobSnapshot } from "@/hooks/useThermalJobRealtime";

/**
 * Analyze & Tune workbench — a single no-scroll workspace: file management on the
 * left, the large thermal image in the center with its tools rail on the right, and
 * the image filmstrip docked along the bottom. Detection settings live in the left
 * rail (no sub-tabs). Batch selection/processing lives in the Library tab.
 */
export function ThermalAnalyzeTune({
  sessionId,
  captures,
  activeCaptureId,
  onActiveChange,
  standards,
  initialParams,
  job,
}: {
  sessionId: string;
  captures: StudioCapture[];
  activeCaptureId?: string | null;
  onActiveChange?: (id: string) => void;
  standards?: string[];
  initialParams?: unknown;
  job?: ThermalJobSnapshot | null;
}) {
  if (!captures.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--graphite-muted)]">
        No captures yet — upload or import from SlateDrop to start tuning.
      </div>
    );
  }
  return (
    <ThermalStudioWorkView
      sessionId={sessionId}
      captures={captures}
      standards={standards}
      selectedId={activeCaptureId ?? undefined}
      onSelect={onActiveChange}
      initialParams={initialParams}
      job={job}
    />
  );
}
