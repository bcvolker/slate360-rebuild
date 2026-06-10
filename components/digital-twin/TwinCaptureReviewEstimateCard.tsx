"use client";

import type { TwinJobCreditEstimate } from "@/lib/twin/processing-estimate-types";
import { formatTwinReviewMinutes } from "@/lib/digital-twin/twin-review-format";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

type Props = {
  estimate: TwinJobCreditEstimate | null;
  loading: boolean;
  error: string | null;
  onAddCredits: () => void;
};

export function TwinCaptureReviewEstimateCard({
  estimate,
  loading,
  error,
  onAddCredits,
}: Props) {
  return (
    <section
      className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] p-3"
      data-twin-review="estimate"
    >
      {loading ? (
        <p className="text-xs text-[var(--graphite-muted)]">Updating estimate…</p>
      ) : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      {estimate ? (
        <>
          <p className="text-sm font-semibold text-[var(--graphite-text-header)]">
            Estimated for this job — ~{estimate.creditsRequired} CREDITS ·{" "}
            {formatTwinReviewMinutes(estimate.estimatedMinutes ?? 1)}
          </p>
          <p className="mt-1 text-[11px] text-[var(--graphite-muted)]">
            credits and time update as you add or remove sources
          </p>
          <div className="my-3 h-px bg-[var(--mobile-app-card-border)]" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-[var(--graphite-text-body)]">
              Your balance {estimate.creditsBalance}
            </span>
            <button
              type="button"
              onClick={onAddCredits}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${twinAccent.button}`}
            >
              + Add credits
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
