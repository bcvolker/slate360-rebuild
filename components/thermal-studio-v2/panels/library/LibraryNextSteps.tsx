"use client";

import { useState } from "react";
import { dispatchThermalJob } from "@/components/thermal-studio-v2/lib/api";
import type { ThermalV2Scope } from "@/components/thermal-studio-v2/types";

/**
 * Right rail — the ONE next-steps panel (doc §1, Tab 1): every action states
 * its scope, reading the single global Scope pill. No duplicate process panel.
 */
export function LibraryNextSteps({
  sessionId,
  scope,
  scopeIds,
  onAddToReport,
  totalInScope,
}: {
  sessionId: string;
  scope: ThermalV2Scope;
  scopeIds: string[];
  onAddToReport: (ids: string[]) => void;
  totalInScope: number;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const disabled = totalInScope === 0 || busy;

  // R1: disable-while-pending — the server also dedupes (dedupe_key), but a
  // client-side guard means a fast double-click never even sends a second
  // request while the first is still in flight.
  async function run(jobType: "extract" | "analyze", label: string) {
    setBusy(true);
    setStatus(`${label}…`);
    const result = await dispatchThermalJob(sessionId, jobType, scopeIds);
    setStatus(result.message);
    setBusy(false);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => void run("extract", "Decoding")}
        title="Turn raw camera files into per-pixel temperature data"
        className="rounded-md border border-[var(--mobile-app-card-border)] px-3 py-2 text-left text-xs font-semibold text-[var(--graphite-text-header)] transition-colors hover:border-[var(--graphite-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Decode temperatures ({totalInScope})
        <div className="mt-0.5 text-[10px] font-normal text-[var(--graphite-muted)]">
          Reads the raw file so every pixel has a real temperature
        </div>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => void run("analyze", "Running AI")}
        title="Have AI scan the decoded images for possible problems"
        className="rounded-md border border-[var(--mobile-app-card-border)] px-3 py-2 text-left text-xs font-semibold text-[var(--graphite-text-header)] transition-colors hover:border-[var(--graphite-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Find problems with AI ({totalInScope})
        <div className="mt-0.5 text-[10px] font-normal text-[var(--graphite-muted)]">
          Suggests hot/cold spots for you to accept, edit, or dismiss
        </div>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onAddToReport(scopeIds)}
        title="Add these images to the report you're building"
        className="rounded-md border border-[var(--mobile-app-card-border)] px-3 py-2 text-left text-xs font-semibold text-[var(--graphite-text-header)] transition-colors hover:border-[var(--graphite-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        ★ Add {totalInScope} to report
      </button>

      {status ? <span className="text-[11px] text-[var(--graphite-muted)]">{status}</span> : null}

      <div className="mt-auto border-t border-[var(--mobile-app-card-border)] pt-2 text-[10px] text-[var(--graphite-muted)]">
        Scope: {scope.kind === "image" ? "This image" : scope.kind === "selected" ? `Selected (${scope.count})` : `All (${scope.count})`}
      </div>
    </div>
  );
}
