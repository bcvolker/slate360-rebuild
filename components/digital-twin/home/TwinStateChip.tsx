"use client";

import { AlertTriangle, Check, CloudUpload, Loader2 } from "lucide-react";

import { TWIN_HUB_STATE_LABEL, type TwinHubState } from "@/lib/digital-twin/twin-hub-state";

const BASE =
  "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide";

/** Five states, five words. Twin blue only on the two live states (uploading, processing). */
export function TwinStateChip({ state }: { state: TwinHubState }) {
  const label = TWIN_HUB_STATE_LABEL[state];
  if (state === "uploading" || state === "processing") {
    return (
      <span className={`${BASE} border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] text-[var(--twin360-blue)]`}>
        {state === "uploading" ? (
          <CloudUpload className="h-3 w-3" aria-hidden />
        ) : (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        )}
        {label}
      </span>
    );
  }
  if (state === "ready") {
    return (
      <span className={`${BASE} border-white/15 bg-white/[0.06] text-zinc-100`}>
        <Check className="h-3 w-3" aria-hidden />
        {label}
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className={`${BASE} border-white/10 bg-white/[0.04] text-[var(--destructive)]`}>
        <AlertTriangle className="h-3 w-3" aria-hidden />
        {label}
      </span>
    );
  }
  return <span className={`${BASE} border-white/10 bg-white/[0.04] text-[var(--graphite-muted)]`}>{label}</span>;
}
