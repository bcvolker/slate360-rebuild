"use client";

import type { TwinProcessingQuality } from "@/lib/twin/processing-estimate-types";

type Props = {
  quality: TwinProcessingQuality;
  canUseHigh: boolean;
  onChange: (quality: TwinProcessingQuality) => void;
};

export function TwinCaptureReviewQuality({ quality, canUseHigh, onChange }: Props) {
  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
        Quality
      </p>
      <div className="flex gap-2">
        {(["standard", "high"] as const).map((tier) => {
          const active = quality === tier;
          const disabled = tier === "high" && !canUseHigh;
          return (
            <button
              key={tier}
              type="button"
              disabled={disabled}
              onClick={() => onChange(tier)}
              className={`min-h-10 flex-1 rounded-xl border px-3 text-sm font-semibold capitalize transition disabled:opacity-40 ${
                active
                  ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)] text-[var(--twin360-blue)]"
                  : "border-[var(--mobile-app-card-border)] text-[var(--graphite-text-body)]"
              }`}
            >
              {tier === "standard" ? "Standard" : "High"}
            </button>
          );
        })}
      </div>
      {!canUseHigh ? (
        <p className="text-[11px] text-[var(--graphite-muted)]">
          High quality requires a Pro Digital Twin subscription.
        </p>
      ) : null}
    </section>
  );
}
