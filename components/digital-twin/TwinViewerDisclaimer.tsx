"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const LEGAL_COPY =
  "Measurements are approximate and for visual coordination only. Not for legal, structural, or survey use. Requires metric scale.";
// Q1: shown instead of LEGAL_COPY when a real metric scale factor was
// recovered and baked into the model (see quality_metrics.scaleFactor /
// manifest.metric_scale_applied) — still not survey-grade, but no longer
// unscaled either.
const METRIC_SCALE_COPY =
  "Measurements are approximate — derived from device motion tracking. Not for legal, structural, or survey use.";

function disclaimerCopy(metricScaleApplied?: boolean): string {
  return metricScaleApplied ? METRIC_SCALE_COPY : LEGAL_COPY;
}

// Shorter variant for inline measure-tool hints (e.g. TwinShareAnnotateShell)
// rather than the footer's full legal copy.
const MEASURE_HINT_DEFAULT = "Approximate — for visual coordination, not survey. Requires metric scale.";
const MEASURE_HINT_METRIC = "Approximate — derived from device motion tracking, not survey.";

export function measureToolDisclaimer(metricScaleApplied?: boolean): string {
  return metricScaleApplied ? MEASURE_HINT_METRIC : MEASURE_HINT_DEFAULT;
}

export function TwinViewerDisclaimer({
  className,
  metricScaleApplied,
}: {
  className?: string;
  metricScaleApplied?: boolean;
}) {
  return (
    <p className={className ?? "text-center text-[11px] leading-snug text-zinc-500"}>
      {disclaimerCopy(metricScaleApplied)}
    </p>
  );
}

export function TwinViewerFooterDisclaimer({
  className,
  metricScaleApplied,
}: {
  className?: string;
  metricScaleApplied?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center justify-center gap-1.5 text-[10px] leading-none text-[var(--graphite-muted)]",
        className,
      )}
      data-twin-chrome="viewer-disclaimer"
    >
      <span>Shared via Slate360 · dimensions approximate</span>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-5 items-center justify-center rounded-full border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_65%,transparent)] text-[var(--graphite-muted)]"
        aria-label="Measurement disclaimer"
        aria-expanded={open}
      >
        <Info className="size-3" aria-hidden />
      </button>
      {open ? (
        <p className="absolute bottom-full left-1/2 mb-1 max-w-[16rem] -translate-x-1/2 rounded-lg border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] px-2 py-1.5 text-[10px] leading-snug text-zinc-400 backdrop-blur-md">
          {disclaimerCopy(metricScaleApplied)}
        </p>
      ) : null}
    </div>
  );
}
