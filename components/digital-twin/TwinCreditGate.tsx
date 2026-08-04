"use client";

import { IconCoins, IconLoader2 } from "@tabler/icons-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
import { useTwinCreditEstimate } from "@/hooks/useTwinCreditEstimate";

type Props = {
  captureId: string | null;
  enabled?: boolean;
  className?: string;
};

export function TwinCreditGate({ captureId, enabled = true, className }: Props) {
  const { estimate, loading, error } = useTwinCreditEstimate(captureId, enabled);

  if (!captureId || !enabled) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.06] bg-white/[0.03] p-3",
        estimate && !estimate.sufficient && "border-red-500/20 bg-red-500/[0.04]",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
        <IconCoins className={cn("h-4 w-4", twinAccent.text)} stroke={1.75} />
        Processing credits
      </div>

      {loading ? (
        <p className="mt-2 inline-flex items-center gap-2 text-xs text-zinc-400">
          <IconLoader2 className={cn("h-3.5 w-3.5 animate-spin", twinAccent.spinner)} />
          Calculating estimate…
        </p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}

      {estimate ? (
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex justify-between gap-2 text-zinc-400">
            <span>Estimated charge</span>
            <span className={twinAccent.text}>{estimate.creditsRequired} credits</span>
          </div>
          <div className="flex justify-between gap-2 text-zinc-400">
            <span>Org balance</span>
            <span className={estimate.sufficient ? "text-zinc-200" : "text-red-200"}>
              {estimate.creditsBalance} credits
            </span>
          </div>
          {!estimate.sufficient ? (
            <p className="pt-1 text-[11px] leading-relaxed text-red-200">
              Add credits before queuing — processing needs {estimate.creditsRequired} but only{" "}
              {estimate.creditsBalance} are available.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
