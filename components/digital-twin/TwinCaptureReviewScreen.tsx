"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader2 } from "@tabler/icons-react";
import { SlateDropFilePickerModal } from "@/components/slatedrop/SlateDropFilePickerModal";
import { useMultipartTwinUpload } from "@/hooks/useMultipartTwinUpload";
import { useTwinGpsFix } from "@/hooks/useTwinGpsFix";
import { useTwinProcessingEstimate } from "@/hooks/useTwinProcessingEstimate";
import {
  clearTwinCapturePendingSession,
  getTwinCapturePendingSession,
  setTwinCapturePendingSession,
  type TwinCapturePendingSession,
  type TwinReviewAddedSource,
} from "@/lib/digital-twin/twin-capture-pending-session";
import {
  clearTwinCaptureReviewPersistedState,
  persistTwinCaptureReviewForCheckout,
  restoreTwinCaptureReviewState,
} from "@/lib/digital-twin/twin-capture-pending-persist";
import { fetchSlateDropFileAsBlob } from "@/lib/digital-twin/twin-review-fetch";
import {
  classifyTwinMedia,
  countTwinEstimateFrames,
  twinMediaToAssetKind,
} from "@/lib/digital-twin/twin-review-media";
import type { TwinJobCreditEstimate, TwinProcessingQuality } from "@/lib/twin/processing-estimate-types";
import type { TwinCreditAsset } from "@/lib/twin/processing-credits";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
import { TwinCaptureCreditsSheet } from "./TwinCaptureCreditsSheet";
import { TwinCaptureReviewClips } from "./TwinCaptureReviewClips";
import { TwinCaptureReviewEstimateCard } from "./TwinCaptureReviewEstimateCard";
import { TwinCaptureReviewQuality } from "./TwinCaptureReviewQuality";
import { TwinCaptureReviewSources } from "./TwinCaptureReviewSources";
import { TwinCaptureReviewTopBar } from "./TwinCaptureReviewTopBar";
import { TwinJobStatus } from "./TwinJobStatus";

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
  const router = useRouter();
  const resolveGpsFix = useTwinGpsFix();
  const upload = useMultipartTwinUpload();

  const [session, setSession] = useState<TwinCapturePendingSession | null>(() =>
    devPreview?.session ?? getTwinCapturePendingSession(),
  );
  const [sessionReady, setSessionReady] = useState(() =>
    Boolean(devPreview?.session ?? getTwinCapturePendingSession()),
  );
  const [scanName, setScanName] = useState(session?.selection.spaceTitle ?? "");
  const [quality, setQuality] = useState<TwinProcessingQuality>("standard");
  const [addedSources, setAddedSources] = useState<TwinReviewAddedSource[]>([]);
  const [slateDropOpen, setSlateDropOpen] = useState(false);
  const [creditsSheetOpen, setCreditsSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [jobQueued, setJobQueued] = useState(() => Boolean(devPreview?.jobQueued));
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);

  useEffect(() => {
    if (devPreview?.session) return;
    if (session) return;
    let cancelled = false;
    void restoreTwinCaptureReviewState().then((restored) => {
      if (cancelled) return;
      if (restored) {
        setTwinCapturePendingSession(restored.session);
        setSession(restored.session);
        setScanName(restored.scanName);
        setQuality(restored.quality);
        setAddedSources(restored.addedSources);
        setRestoredNotice("Restored your scan");
      }
      setSessionReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    const credits = new URLSearchParams(window.location.search).get("credits");
    if (credits === "success") {
      setCheckoutNotice("Credits added — your scan is still here.");
    } else if (credits === "cancelled") {
      setCheckoutNotice("Checkout cancelled — your scan is still here.");
    }
  }, []);

  const clipFiles = useMemo(
    () => (session?.clips ?? []).flatMap((clip) => clip.files),
    [session?.clips],
  );

  const captureCategories = useMemo(
    () => clipFiles.map((file) => classifyTwinMedia(file)),
    [clipFiles],
  );

  const localAddedFiles = useMemo(
    () =>
      addedSources
        .filter((row): row is TwinReviewAddedSource & { file: File } => row.origin !== "slatedrop")
        .map((row) => row.file),
    [addedSources],
  );

  const estimateFiles = useMemo(
    () => [
      ...clipFiles,
      ...localAddedFiles,
      ...addedSources
        .filter((row) => row.origin === "slatedrop")
        .map((row) =>
          new File([], row.pickerFile.name, {
            type: row.pickerFile.type || "application/octet-stream",
          }),
        ),
    ],
    [addedSources, clipFiles, localAddedFiles],
  );

  const creditSources = useMemo<TwinCreditAsset[]>(
    () =>
      estimateFiles.map((file) => ({
        asset_kind: twinMediaToAssetKind(file),
        file_size_bytes: file.size,
      })),
    [estimateFiles],
  );

  const frameCount = useMemo(() => countTwinEstimateFrames(estimateFiles), [estimateFiles]);
  const totalDurationSeconds = useMemo(
    () => (session?.clips ?? []).reduce((sum, clip) => sum + clip.durationSeconds, 0),
    [session?.clips],
  );

  const { estimate: liveEstimate, loading: estimateLoading, error: estimateError } =
    useTwinProcessingEstimate({
      sources: creditSources,
      frameCount,
      quality,
      enabled: !devPreview && creditSources.length > 0,
    });
  const estimate = devPreview?.estimate ?? liveEstimate;
  const estimateLoadingState = devPreview ? false : estimateLoading;

  useEffect(() => {
    if (devPreview?.openCreditsSheet) setCreditsSheetOpen(true);
  }, [devPreview?.openCreditsSheet]);

  const handleBack = useCallback(() => {
    // Leaving mid-upload/submit would orphan the in-flight job.
    if (submitting || upload.isRunning) return;
    if (jobQueued) {
      router.push("/digital-twin/twins");
      return;
    }
    router.push("/digital-twin/capture");
  }, [jobQueued, router, submitting, upload.isRunning]);

  const handleRemoveClip = useCallback((clipId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, clips: prev.clips.filter((clip) => clip.id !== clipId) };
      setTwinCapturePendingSession(next);
      return next;
    });
  }, []);

  const handleAddFiles = useCallback((files: File[], origin: "camera_roll" | "files") => {
    setAddedSources((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `local-${Date.now()}-${file.name}`,
        origin,
        file,
      })),
    ]);
  }, []);

  const handleGoToTwins = useCallback(() => {
    router.push("/digital-twin/twins");
  }, [router]);

  const handleCreateTwin = useCallback(async () => {
    if (!session || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const slatedropFiles = await Promise.all(
        addedSources
          .filter((row) => row.origin === "slatedrop")
          .map((row) => fetchSlateDropFileAsBlob(row.pickerFile)),
      );
      const allFiles = [...clipFiles, ...localAddedFiles, ...slatedropFiles];
      if (!allFiles.length) throw new Error("Add at least one source");

      const gps = await resolveGpsFix();
      const title = scanName.trim() || session.selection.spaceTitle;
      await upload.startUpload(
        {
          spaceId: session.selection.spaceId,
          projectId: session.selection.projectId,
          title,
          gps,
        },
        allFiles,
      );
      await upload.enqueueJob("spz", quality);
      setJobQueued(true);
      clearTwinCapturePendingSession();
      clearTwinCaptureReviewPersistedState();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not create twin");
    } finally {
      setSubmitting(false);
    }
  }, [
    addedSources,
    clipFiles,
    localAddedFiles,
    resolveGpsFix,
    quality,
    scanName,
    session,
    submitting,
    upload,
  ]);

  if (!sessionReady) {
    return (
      <div
        className="flex min-h-0 flex-1 items-center justify-center px-4 text-sm text-[var(--graphite-muted)]"
        data-twin-review="loading"
      >
        Loading review…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-sm text-[var(--graphite-muted)]">No capture session found.</p>
        <button type="button" onClick={handleBack} className={cn("text-sm font-semibold", twinAccent.link)}>
          Back to capture
        </button>
      </div>
    );
  }

  const lowCredits = estimate && !estimate.sufficient;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas)]"
      data-twin-review="screen"
    >
      <TwinCaptureReviewTopBar onBack={handleBack} />

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-28 pt-3 space-y-4"
        data-twin-review="scroll"
      >
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[var(--graphite-muted)]">
            Name this scan (optional — can name later)
          </span>
          <input
            type="text"
            value={scanName}
            onChange={(event) => setScanName(event.target.value)}
            className="w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-3 py-2.5 text-sm text-[var(--graphite-text-header)] outline-none focus:border-[var(--accent-border-blue)]"
          />
        </label>

        <TwinCaptureReviewClips
          clips={session.clips}
          totalDurationSeconds={totalDurationSeconds}
          frameCount={frameCount}
          onRemoveClip={handleRemoveClip}
        />

        <TwinCaptureReviewSources
          projectId={session.selection.projectId}
          addedSources={addedSources}
          captureCategories={captureCategories}
          onAddFiles={handleAddFiles}
          onRemoveSource={(id) =>
            setAddedSources((prev) => prev.filter((row) => row.id !== id))
          }
          onOpenSlateDrop={() => setSlateDropOpen(true)}
        />

        <TwinCaptureReviewEstimateCard
          estimate={estimate}
          loading={estimateLoadingState}
          error={estimateError}
          onAddCredits={() => setCreditsSheetOpen(true)}
        />

        {checkoutNotice ? (
          <div className="rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] px-3 py-2 text-xs text-[var(--graphite-text-body)]">
            {checkoutNotice}
          </div>
        ) : null}

        {restoredNotice ? (
          <div
            className="rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] px-3 py-2 text-xs text-[var(--graphite-text-body)]"
            data-twin-review="restored-notice"
          >
            {restoredNotice}
          </div>
        ) : null}

        {lowCredits ? (
          <div
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200"
            data-twin-review="low-credits"
          >
            This job needs ~{estimate.creditsRequired} credits — you have {estimate.creditsBalance}
          </div>
        ) : null}

        <TwinCaptureReviewQuality
          quality={quality}
          canUseHigh={canUseHighQuality}
          onChange={setQuality}
        />

        {upload.isRunning ? (
          <p className="inline-flex items-center gap-2 text-xs text-[var(--graphite-muted)]">
            <IconLoader2 className={cn("h-3.5 w-3.5 animate-spin", twinAccent.spinner)} />
            Uploading… {upload.overallProgress}%
          </p>
        ) : null}

        {jobQueued && (upload.captureId || devPreview?.mockCaptureId) ? (
          <TwinJobStatus
            captureId={upload.captureId ?? devPreview?.mockCaptureId ?? null}
            spaceId={session.selection.spaceId}
          />
        ) : null}

        {submitError ? <p className="text-xs text-red-300">{submitError}</p> : null}
      </div>

      <div
        className="shrink-0 border-t border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] px-3 pt-3 backdrop-blur-xl"
        style={{ paddingBottom: `max(12px, env(safe-area-inset-bottom))` }}
        data-twin-review="action-bar"
      >
        {jobQueued ? (
          <div className="space-y-3" data-twin-review="post-submit">
            <p className="text-center text-sm font-semibold text-[var(--graphite-text-header)]">
              Processing started
            </p>
            <button
              type="button"
              onClick={handleGoToTwins}
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--twin360-blue)] text-sm font-bold text-[var(--graphite-canvas)]"
            >
              Go to My Twins
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              disabled={
                submitting ||
                upload.isRunning ||
                Boolean(lowCredits) ||
                // Estimate still loading blocks; a FAILED estimate must not
                // dead-end the button when real clips exist.
                (!estimate && (estimateLoadingState || !estimateError))
              }
              onClick={() => void handleCreateTwin()}
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--twin360-blue)] text-sm font-bold text-[var(--graphite-canvas)] disabled:opacity-50"
            >
              {submitting || upload.isRunning
                ? "Creating twin…"
                : estimate
                  ? `Create twin · ~${estimate.creditsRequired} credits`
                  : "Create twin"}
            </button>
            {estimateError && !estimate ? (
              <p className="mt-2 text-center text-[11px] font-semibold text-red-300">
                Credit estimate unavailable — you can still create the twin.
              </p>
            ) : null}
            <p className="mt-2 text-center text-[11px] text-[var(--graphite-muted)]">
              we&apos;ll notify you when it&apos;s ready — find it in My Twins
            </p>
          </>
        )}
      </div>

      <SlateDropFilePickerModal
        open={slateDropOpen}
        projectId={session.selection.projectId}
        onClose={() => setSlateDropOpen(false)}
        onConfirm={(files) => {
          setAddedSources((prev) => [
            ...prev,
            ...files.map((file) => ({
              id: `sd-${file.id}`,
              origin: "slatedrop" as const,
              pickerFile: file,
            })),
          ]);
          setSlateDropOpen(false);
        }}
        title="Add from SlateDrop"
      />

      <TwinCaptureCreditsSheet
        open={creditsSheetOpen}
        creditsRequired={estimate?.creditsRequired ?? 0}
        returnTo="/digital-twin/capture/review"
        onBeforeCheckout={async () => {
          if (!session) return;
          await persistTwinCaptureReviewForCheckout({
            session,
            scanName,
            quality,
            addedSources,
          });
        }}
        onClose={() => setCreditsSheetOpen(false)}
      />
    </div>
  );
}
