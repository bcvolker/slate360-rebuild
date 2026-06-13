"use client";

import { IconLoader2 } from "@tabler/icons-react";
import type { TwinJobCreditEstimate, TwinProcessingQuality } from "@/lib/twin/processing-estimate-types";
import { formatTwinReviewMinutes } from "@/lib/digital-twin/twin-review-format";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
import { TwinSubmitGlassCard } from "./TwinSubmitGlassCard";
import { twinSubmitTokens } from "./twin-submit-tokens";

type Props = {
  quality: TwinProcessingQuality;
  canUseHigh: boolean;
  estimate: TwinJobCreditEstimate | null;
  loading: boolean;
  error: string | null;
  onChangeQuality: (quality: TwinProcessingQuality) => void;
  onTopUpCredits: () => void;
};

const QUALITY_OPTIONS: { id: TwinProcessingQuality; label: string; multiplier: string }[] = [
  { id: "standard", label: "Standard", multiplier: "1.0×" },
  { id: "high", label: "High", multiplier: "1.35×" },
];

export function TwinSubmitStepQuality({
  quality,
  canUseHigh,
  estimate,
  loading,
  error,
  onChangeQuality,
  onTopUpCredits,
}: Props) {
  const lowCredits = estimate && !estimate.sufficient;

  return (
    <div className="space-y-4" data-twin-submit="step-quality">
      <TwinSubmitGlassCard title="Quality level">
        <div className="flex gap-2">
          {QUALITY_OPTIONS.map((tier) => {
            const active = quality === tier.id;
            const disabled = tier.id === "high" && !canUseHigh;
            return (
              <button
                key={tier.id}
                type="button"
                disabled={disabled}
                onClick={() => onChangeQuality(tier.id)}
                className={cn(
                  "min-h-10 flex-1 rounded-xl border px-2 text-sm font-semibold transition disabled:opacity-40",
                  active
                    ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)] text-[var(--twin360-blue)]"
                    : "border-[var(--mobile-app-card-border)] text-[var(--graphite-text-body)]",
                )}
              >
                {tier.label}
                <span className="mt-0.5 block text-[10px] font-normal text-[var(--graphite-muted)]">
                  {tier.multiplier}
                </span>
              </button>
            );
          })}
        </div>
        {!canUseHigh ? (
          <p className="mt-2 text-[11px] text-[var(--graphite-muted)]">
            High quality requires a Pro Digital Twin subscription.
          </p>
        ) : null}
      </TwinSubmitGlassCard>

      <TwinSubmitGlassCard title="Credit calculator" dataAttr="calculator">
        {loading ? (
          <p className="inline-flex items-center gap-2 text-xs text-[var(--graphite-muted)]">
            <IconLoader2 className={cn("h-3.5 w-3.5 animate-spin", twinAccent.spinner)} />
            Updating estimate…
          </p>
        ) : null}
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
        {estimate ? (
          <div className="space-y-2">
            <CalcRow label="Assets in job" value={`${estimate.assetCount}`} />
            <CalcRow
              label="Quality multiplier"
              value={quality === "high" ? "1.35×" : "1.0×"}
            />
            <div className="my-2 h-px bg-[var(--mobile-app-card-border)]" />
            <p className="text-base font-bold text-[var(--graphite-text-header)]">
              Total: {estimate.creditsRequired} credits ·{" "}
              {formatTwinReviewMinutes(estimate.estimatedMinutes ?? 1)}
            </p>
            <p className="text-[11px] text-[var(--graphite-muted)]">
              Your balance: {estimate.creditsBalance} credits
            </p>
          </div>
        ) : null}
      </TwinSubmitGlassCard>

      {lowCredits ? (
        <div className="space-y-2">
          <p className="text-xs text-red-200">
            Insufficient credits — this job needs ~{estimate?.creditsRequired} credits.
          </p>
          <button type="button" onClick={onTopUpCredits} className={twinSubmitTokens.secondaryCta}>
            Top up credits
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CalcRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-[var(--graphite-muted)]">{label}</span>
      <span className="font-semibold text-[var(--graphite-text-body)]">{value}</span>
    </div>
  );
}
