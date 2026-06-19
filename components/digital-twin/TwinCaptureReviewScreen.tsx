"use client";

import { SlateDropFilePickerModal } from "@/components/slatedrop/SlateDropFilePickerModal";
import type { TwinCapturePendingSession } from "@/lib/digital-twin/twin-capture-pending-session";
import type { TwinJobCreditEstimate } from "@/lib/twin/processing-estimate-types";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
import { TwinCaptureCreditsSheet } from "./TwinCaptureCreditsSheet";
import { persistTwinCaptureReviewForCheckout } from "@/lib/digital-twin/twin-capture-pending-persist";
import { TwinSubmitStepClips } from "./submit/TwinSubmitStepClips";
import { TwinSubmitStepConfirm } from "./submit/TwinSubmitStepConfirm";
import { TwinSubmitStepperHeader } from "./submit/TwinSubmitStepperHeader";
import { TwinSubmitStepQuality } from "./submit/TwinSubmitStepQuality";
import { TwinSubmitStepSources } from "./submit/TwinSubmitStepSources";
import { TwinSubmitStepStatus } from "./submit/TwinSubmitStepStatus";
import { twinSubmitTokens } from "./submit/twin-submit-tokens";
import { useTwinSubmitReviewState } from "./submit/useTwinSubmitReviewState";

type Props = {
  canUseHighQuality: boolean;
  devPreview?: {
    estimate: TwinJobCreditEstimate;
    openCreditsSheet?: boolean;
    session?: TwinCapturePendingSession;
    jobQueued?: boolean;
    mockCaptureId?: string;
  };
};

export function TwinCaptureReviewScreen({ canUseHighQuality, devPreview }: Props) {
  const state = useTwinSubmitReviewState(devPreview);

  if (!state.sessionReady) {
    return (
      <div
        className="flex min-h-0 flex-1 items-center justify-center px-4 text-sm text-[var(--graphite-muted)]"
        data-twin-review="loading"
      >
        Loading review…
      </div>
    );
  }

  if (!state.session) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-sm text-[var(--graphite-muted)]">No capture session found.</p>
        <button
          type="button"
          onClick={state.handleBack}
          className={cn("text-sm font-semibold", twinAccent.link)}
        >
          Back to capture
        </button>
      </div>
    );
  }

  const showFooter = state.step !== "status" && state.step !== "confirm";
  const captureId = state.upload.captureId ?? state.devPreview?.mockCaptureId ?? null;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas)]"
      data-twin-review="screen"
    >
      <TwinSubmitStepperHeader step={state.step} onBack={state.handleBack} />

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-28 pt-3"
        data-twin-submit="scroll"
      >
        {state.step === "clips" ? (
          <TwinSubmitStepClips
            clips={state.session.clips}
            totalDurationSeconds={state.totalDurationSeconds}
            onRemoveClip={state.handleRemoveClip}
            onReorderClip={state.handleReorderClip}
            onAddMoreMedia={() => state.setStep("sources")}
            onReturnToCapture={() => state.handleBack()}
          />
        ) : null}

        {state.step === "sources" ? (
          <TwinSubmitStepSources
            addedSources={state.addedSources}
            captureCategories={state.captureCategories}
            assetCount={state.assetCount}
            onAddFiles={state.handleAddFiles}
            onRemoveSource={(id) =>
              state.setAddedSources((prev) => prev.filter((row) => row.id !== id))
            }
            onOpenSlateDrop={() => state.setSlateDropOpen(true)}
          />
        ) : null}

        {state.step === "quality" ? (
          <TwinSubmitStepQuality
            quality={state.quality}
            canUseHigh={canUseHighQuality}
            estimate={state.estimate}
            loading={state.estimateLoadingState}
            error={state.estimateError}
            onChangeQuality={state.setQuality}
            onTopUpCredits={() => state.setCreditsSheetOpen(true)}
          />
        ) : null}

        {state.step === "confirm" ? (
          <TwinSubmitStepConfirm
            scanName={state.scanName}
            clips={state.session.clips}
            addedSources={state.addedSources}
            quality={state.quality}
            estimate={state.estimate}
            totalDurationSeconds={state.totalDurationSeconds}
            submitting={state.submitting}
            uploadProgress={state.upload.isRunning ? state.upload.overallProgress : null}
            onScanNameChange={state.setScanName}
            onSubmit={() => void state.handleCreateTwin()}
            onSaveForLater={() => void state.handleSaveForLater()}
          />
        ) : null}

        {state.step === "status" ? (
          <TwinSubmitStepStatus
            captureId={captureId}
            spaceId={state.session.selection.spaceId}
            savedForLater={state.savedForLater}
            onGoToTwins={state.handleGoToTwins}
          />
        ) : null}

        {state.checkoutNotice ? (
          <div className="mt-4 rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] px-3 py-2 text-xs text-[var(--graphite-text-body)]">
            {state.checkoutNotice}
          </div>
        ) : null}

        {state.restoredNotice ? (
          <div
            className="mt-4 rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] px-3 py-2 text-xs text-[var(--graphite-text-body)]"
            data-twin-review="restored-notice"
          >
            {state.restoredNotice}
          </div>
        ) : null}

        {state.submitError ? (
          <p className="mt-4 text-xs text-red-300">{state.submitError}</p>
        ) : null}
      </div>

      {showFooter ? (
        <div
          className="shrink-0 border-t border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] px-3 pt-3 backdrop-blur-xl"
          style={{ paddingBottom: `max(12px, env(safe-area-inset-bottom))` }}
          data-twin-submit="footer"
        >
          <button
            type="button"
            disabled={!state.canAdvance}
            onClick={state.goNext}
            className={twinSubmitTokens.primaryCta}
          >
            Continue
          </button>
        </div>
      ) : null}

      <SlateDropFilePickerModal
        open={state.slateDropOpen}
        projectId={state.session.selection.projectId}
        onClose={() => state.setSlateDropOpen(false)}
        onConfirm={(files) => {
          state.setAddedSources((prev) => [
            ...prev,
            ...files.map((file) => ({
              id: `sd-${file.id}`,
              origin: "slatedrop" as const,
              pickerFile: file,
            })),
          ]);
          state.setSlateDropOpen(false);
        }}
        title="Add from SlateDrop"
      />

      <TwinCaptureCreditsSheet
        open={state.creditsSheetOpen}
        creditsRequired={state.estimate?.creditsRequired ?? 0}
        returnTo="/digital-twin/capture/review"
        onBeforeCheckout={async () => {
          await persistTwinCaptureReviewForCheckout({
            session: state.session!,
            scanName: state.scanName,
            quality: state.quality,
            addedSources: state.addedSources,
          });
        }}
        onClose={() => state.setCreditsSheetOpen(false)}
      />
    </div>
  );
}
