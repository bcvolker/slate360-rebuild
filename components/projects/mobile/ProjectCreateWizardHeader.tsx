"use client";

import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECT_CREATE_TOTAL_STEPS } from "./project-create-constants";

type Props = {
  step: number;
  onBack: () => void;
};

export function ProjectCreateWizardHeader({ step, onBack }: Props) {
  return (
    <div
      className="sticky top-0 z-50 border-b border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_95%,transparent)] px-4 py-3 backdrop-blur-md"
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 inline-flex p-2 text-[var(--graphite-text-header)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="font-mono text-xs tracking-[0.12em] text-[var(--graphite-muted)]">
            STEP {step} OF {PROJECT_CREATE_TOTAL_STEPS}
          </div>
          <div className="font-semibold text-[var(--graphite-text-header)]">Create New Project</div>
        </div>

        <div
          className="flex gap-1.5"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={PROJECT_CREATE_TOTAL_STEPS}
          aria-label={`Step ${step} of ${PROJECT_CREATE_TOTAL_STEPS}`}
        >
          {Array.from({ length: PROJECT_CREATE_TOTAL_STEPS }, (_, index) => {
            const stepNumber = index + 1;
            return (
              <div
                key={stepNumber}
                className={cn(
                  "h-1.5 w-6 rounded-full transition-colors",
                  stepNumber <= step ? "bg-[var(--graphite-primary)]" : "bg-white/20",
                )}
                aria-hidden
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
