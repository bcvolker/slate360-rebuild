"use client";

import { Check, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type Phase = "processing" | "complete" | "failed";

type Props = {
  phase: Phase;
  title: string;
  spaceId: string | null;
  progress: number;
  onRetry: () => void;
};

export function TwinReviewProcessingState({ phase, title, spaceId, progress, onRetry }: Props) {
  const router = useRouter();
  const safeProgress = Math.min(100, Math.max(5, progress));

  if (phase === "complete") {
    return (
      <StateShell>
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--twin360-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)]">
          <Check className="h-7 w-7 text-[var(--twin360-blue)]" aria-hidden="true" />
        </div>
        <StateCopy title="Your twin is ready" detail={title} />
        <button
          type="button"
          onClick={() => router.push(spaceId ? `/digital-twin/twins/${spaceId}` : "/digital-twin/twins")}
          className="flex min-h-14 w-full items-center justify-center rounded-xl border border-[var(--twin360-blue)] bg-[var(--twin360-blue)] px-4 text-sm font-semibold text-[var(--graphite-canvas)]"
        >
          View twin
        </button>
      </StateShell>
    );
  }

  if (phase === "failed") {
    return (
      <StateShell>
        <StateCopy
          title="This twin could not be finished"
          detail="Your sources are still here. You can try again when you are ready."
        />
        <button
          type="button"
          onClick={onRetry}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-[var(--twin360-blue)] bg-[var(--twin360-blue)] px-4 text-sm font-semibold text-[var(--graphite-canvas)]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </StateShell>
    );
  }

  return (
    <StateShell>
      <StateCopy title="Building your twin" detail={title} />
      <div className="w-full">
        <div className="mb-2 flex items-center justify-between text-sm text-[var(--graphite-text-body)]">
          <span>{processingLabel(safeProgress)}</span>
          <span className="tabular-nums text-[var(--graphite-muted)]">{safeProgress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-xl bg-white/[0.08]">
          <div className="h-full bg-[var(--twin360-blue)] transition-[width] duration-500" style={{ width: `${safeProgress}%` }} />
        </div>
      </div>
      <p className="text-center text-xs leading-relaxed text-[var(--graphite-muted)]">
        You can leave this screen. We will keep working and show the result in My Twins.
      </p>
      <button
        type="button"
        onClick={() => router.push("/digital-twin/twins")}
        className="min-h-12 px-4 text-sm font-semibold text-[var(--graphite-text-body)]"
      >
        Go to My Twins
      </button>
    </StateShell>
  );
}

function StateShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
      {children}
    </div>
  );
}

function StateCopy({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="text-center">
      <h1 className="text-xl font-semibold text-[var(--graphite-text-header)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--graphite-muted)]">{detail}</p>
    </div>
  );
}

function processingLabel(progress: number): string {
  if (progress < 20) return "Preparing sources";
  if (progress < 55) return "Building the model";
  if (progress < 85) return "Finishing details";
  return "Almost ready";
}
