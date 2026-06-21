"use client";

import Link from "next/link";
import { ArrowLeft, Camera, Map } from "lucide-react";

type Props = {
  walkLabel: string;
  /** Plan sets ready to walk. The fork only reaches this screen when ≥ 1 exists. */
  readyPlanCount: number;
  onWalkOnPlans: () => void;
  onCameraOnly: () => void;
};

/**
 * Graphite-Glass walk-start sheet — replaces the legacy amber
 * CaptureV2StartChoiceSheet. Single screen, safe-area aware. Offers the two
 * ways to capture this visit: on the project's plans (pins photos to location)
 * or camera-only. Picking *which* plan set + clean/annotated happens on the
 * plan canvas (plan-selection slice).
 */
export function WalkStartSheet({ walkLabel, readyPlanCount, onWalkOnPlans, onCameraOnly }: Props) {
  return (
    <section
      className="relative flex min-h-0 flex-1 flex-col items-center justify-center bg-[var(--graphite-canvas)] px-4 pb-safe pt-[max(env(safe-area-inset-top),1rem)] text-white"
      data-capture-chrome="start-choice-sheet"
    >
      <div className="w-full max-w-sm">
        <Link
          href="/site-walk"
          className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] px-3 text-xs font-semibold text-white/80 backdrop-blur-md transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>

        <div className="rounded-3xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] p-6 text-center shadow-lg shadow-black/40 backdrop-blur-md">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-primary)]">
            Start walk
          </p>
          <h1 className="mt-1 truncate text-lg font-bold text-white">{walkLabel}</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">How do you want to capture this visit?</p>

          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              onClick={onWalkOnPlans}
              data-capture-chrome="start-choice-plan"
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-[var(--graphite-primary)] px-4 text-left text-[var(--graphite-canvas)] transition-opacity hover:opacity-90"
            >
              <Map className="h-5 w-5 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-bold">Walk on plans</span>
                <span className="block text-xs font-medium opacity-80">
                  {readyPlanCount} plan set{readyPlanCount === 1 ? "" : "s"} ready · pins photos to location
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={onCameraOnly}
              data-capture-chrome="start-choice-camera"
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[var(--mobile-app-card-border)] bg-white/[0.04] px-4 text-left text-white transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_36%,transparent)] hover:bg-white/[0.08]"
            >
              <Camera className="h-5 w-5 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-bold">Walk without plan</span>
                <span className="block text-xs font-medium text-white/55">Just photos — no plan needed</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
