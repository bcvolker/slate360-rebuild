"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { TWIN_SUBMIT_STEPS, type TwinSubmitStepId } from "./twin-submit-tokens";

type Props = {
  step: TwinSubmitStepId;
  onBack: () => void;
};

export function TwinSubmitStepperHeader({ step, onBack }: Props) {
  const stepIndex = TWIN_SUBMIT_STEPS.findIndex((row) => row.id === step);

  return (
    <header
      className="shrink-0"
      data-twin-submit="stepper-header"
      style={{
        paddingTop: `max(env(safe-area-inset-top), 12px)`,
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      <div
        className="flex h-11 items-center gap-2 border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] px-3 backdrop-blur-md"
        style={{ borderRadius: 12 }}
      >
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)]"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-[var(--graphite-text-header)]">
          Submit for Digital Twin
        </p>
        <span className="h-8 w-8 shrink-0" aria-hidden />
      </div>

      <div
        className="mt-2 flex items-center justify-center gap-1.5"
        role="progressbar"
        aria-valuenow={stepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={TWIN_SUBMIT_STEPS.length}
        aria-label={`Step ${stepIndex + 1} of ${TWIN_SUBMIT_STEPS.length}`}
      >
        {TWIN_SUBMIT_STEPS.map((row, index) => (
          <span
            key={row.id}
            className={cn(
              "h-1.5 rounded-full transition-all",
              index <= stepIndex
                ? "w-5 bg-[var(--twin360-blue)]"
                : "w-1.5 bg-[var(--mobile-app-card-border)]",
            )}
            aria-hidden
          />
        ))}
      </div>
    </header>
  );
}
