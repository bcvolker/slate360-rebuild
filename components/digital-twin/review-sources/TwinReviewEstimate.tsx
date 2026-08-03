"use client";

import { Coins, Loader2 } from "lucide-react";
import type { TwinJobCreditEstimate } from "@/lib/twin/processing-estimate-types";

type Props = {
  estimate: TwinJobCreditEstimate | null;
  loading: boolean;
  error: string | null;
};

export function TwinReviewEstimate({ estimate, loading, error }: Props) {
  return (
    <section
      className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
      aria-labelledby="twin-review-estimate-heading"
      data-twin-review="estimate"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="twin-review-estimate-heading" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
            Before you process
          </p>
          <p className="mt-1 text-sm text-[var(--graphite-text-body)]">
            Your estimate updates as sources are added.
          </p>
        </div>
        <Coins className="h-5 w-5 text-[var(--graphite-muted)]" aria-hidden="true" />
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-[var(--graphite-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Calculating estimate
        </div>
      ) : estimate ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label="Needed" value={`${estimate.creditsRequired} credits`} emphasized />
          <Metric label="Available" value={`${estimate.creditsBalance} credits`} />
        </div>
      ) : (
        <p className="mt-5 text-sm text-[var(--graphite-muted)]">
          {error ?? "Add a source to see the estimate."}
        </p>
      )}

      {estimate && !estimate.sufficient ? (
        <p className="mt-4 text-xs text-[var(--graphite-muted)]">
          You need more credits before this twin can be processed.
        </p>
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="border-l border-white/10 pl-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">{label}</p>
      <p className={emphasized ? "mt-1 text-lg font-semibold text-[var(--graphite-text-header)]" : "mt-1 text-lg font-semibold text-[var(--graphite-text-body)]"}>
        {value}
      </p>
    </div>
  );
}
