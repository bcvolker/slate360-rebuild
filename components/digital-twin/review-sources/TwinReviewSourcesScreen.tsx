"use client";

import { ArrowLeft } from "lucide-react";
import { useM1ReviewSources, type M1ReviewDevPreview } from "@/hooks/useM1ReviewSources";
import type {
  TwinReviewInitialCapture,
  TwinReviewTarget,
} from "@/lib/digital-twin/review-source-types";
import { TwinReviewActions } from "./TwinReviewActions";
import { TwinReviewEstimate } from "./TwinReviewEstimate";
import { TwinReviewProcessingState } from "./TwinReviewProcessingState";
import { TwinReviewSourceList } from "./TwinReviewSourceList";
import { TwinReviewSourcePicker } from "./TwinReviewSourcePicker";

type Props = {
  initialCapture?: TwinReviewInitialCapture;
  initialTarget?: TwinReviewTarget;
  allowPendingSession?: boolean;
  devPreview?: M1ReviewDevPreview;
};

export function TwinReviewSourcesScreen(props: Props) {
  const state = useM1ReviewSources(props);

  if (!state.sessionReady) return <CenteredMessage message="Loading your sources…" />;
  if (!state.session && !state.target) {
    return <CenteredMessage message="No capture is ready to review." actionLabel="Back" onAction={state.handleBack} />;
  }

  const phase = resolvePhase({
    captureStatus: state.initialCaptureStatus,
    jobStatus: state.job?.status,
    processRequested: state.processRequested,
  });
  if (phase !== "review") {
    return (
      <TwinReviewProcessingState
        phase={phase}
        title={state.title}
        spaceId={state.target?.spaceId ?? null}
        progress={state.job?.progress_pct ?? 5}
        onRetry={state.handleRetry}
      />
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-[var(--graphite-canvas)]" data-twin-review="screen">
      <header
        className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3"
        data-twin-review="top-bar"
      >
        <button
          type="button"
          onClick={state.handleBack}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-[var(--graphite-muted)] hover:bg-white/[0.06] hover:text-[var(--graphite-text-header)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-muted)]">Twin 360</p>
          <h1 className="truncate text-lg font-semibold text-[var(--graphite-text-header)]">Review &amp; Sources</h1>
        </div>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4"
        data-twin-review="scroll"
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
          <section>
            <p className="text-sm text-[var(--graphite-muted)]">
              Check what you collected, add anything missing, then choose when to process.
            </p>
            <p className="mt-2 truncate text-base font-semibold text-[var(--graphite-text-header)]">{state.title}</p>
          </section>

          <TwinReviewSourceList
            sources={state.sources}
            disabled={state.processState !== "idle"}
            onChipChange={state.handleChipChange}
            onRemove={state.handleRemoveSource}
          />
          <TwinReviewSourcePicker
            projectId={state.target?.projectId ?? null}
            disabled={state.processState !== "idle"}
            onAddFiles={state.handleAddFiles}
            onAddSlateDrop={state.handleAddSlateDrop}
          />

          {state.sourceNotice ? (
            <p className="text-xs text-[var(--graphite-muted)]" role="status">{state.sourceNotice}</p>
          ) : null}
          {state.processError ? (
            <p className="text-xs text-red-300" role="alert">{state.processError}</p>
          ) : null}

          <TwinReviewEstimate
            estimate={state.estimate}
            loading={state.estimateLoading}
            error={state.estimateError}
          />
          <TwinReviewActions
            disabled={!state.canProcess}
            busy={state.processState === "processing"}
            uploading={state.processState === "uploading"}
            sufficient={state.estimate?.sufficient ?? false}
            onProcess={() => void state.handleProcess()}
          />
        </div>
      </div>
    </main>
  );
}

function CenteredMessage({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm text-[var(--graphite-muted)]">{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="min-h-12 rounded-xl border border-white/10 px-5 text-sm font-semibold text-[var(--graphite-text-body)]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function resolvePhase(args: {
  captureStatus: string;
  jobStatus?: string;
  processRequested: boolean;
}): "review" | "processing" | "complete" | "failed" {
  if (args.jobStatus === "completed" || args.captureStatus === "ready" || args.captureStatus === "processed") return "complete";
  if (args.jobStatus === "failed" || args.captureStatus === "failed") return "failed";
  if (
    args.processRequested ||
    args.jobStatus === "queued" ||
    args.jobStatus === "processing" ||
    args.captureStatus === "queued" ||
    args.captureStatus === "processing"
  ) {
    return "processing";
  }
  return "review";
}
