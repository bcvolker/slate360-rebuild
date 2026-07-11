"use client";

import { useSaveStatus, retryAllFailed } from "@/components/thermal-studio-v2/lib/save-status";

/**
 * R1 "never lie" reliability pack: a global chip reflecting the worst autosave
 * state across every capture (spots/tuning/findings). Error state is red with
 * a Retry action — never a silent `.catch(() => {})` again. L1+W3 restyles
 * this into the shell's one-pill layout; the state machine here is final.
 */
export function SavedStatusChip() {
  const { status, failedCount } = useSaveStatus();

  if (status === "idle") return null;

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={retryAllFailed}
        title={`${failedCount} change${failedCount === 1 ? "" : "s"} did not save`}
        className="flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-400"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Not saved — Retry
      </button>
    );
  }

  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 rounded-md border border-[var(--mobile-app-card-border)] px-2 py-0.5 text-[11px] text-[var(--graphite-muted)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--graphite-muted)]" />
        Saving…
      </span>
    );
  }

  return (
    <span
      title="All changes saved"
      className="flex items-center gap-1.5 rounded-md border border-[var(--mobile-app-card-border)] px-2 py-0.5 text-[11px] text-[var(--graphite-muted)]"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--graphite-muted)]" />
      Saved ✓
    </span>
  );
}
