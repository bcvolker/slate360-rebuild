"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { TwinSubmitStepId } from "./twin-submit-tokens";

type DevPreview = {
  estimate: TwinJobCreditEstimate;
  openCreditsSheet?: boolean;
  session?: TwinCapturePendingSession;
  jobQueued?: boolean;
  mockCaptureId?: string;
};

export function useTwinSubmitReviewState(devPreview?: DevPreview) {
  const router = useRouter();
  const resolveGpsFix = useTwinGpsFix();
  const upload = useMultipartTwinUpload();

  const [session, setSession] = useState<TwinCapturePendingSession | null>(() =>
    devPreview?.session ?? getTwinCapturePendingSession(),
  );
  const [sessionReady, setSessionReady] = useState(() =>
    Boolean(devPreview?.session ?? getTwinCapturePendingSession()),
  );
  const [step, setStep] = useState<TwinSubmitStepId>(() =>
    devPreview?.jobQueued ? "status" : "clips",
  );
  const [scanName, setScanName] = useState(session?.selection.spaceTitle ?? "");
  const [quality, setQuality] = useState<TwinProcessingQuality>("standard");
  const [addedSources, setAddedSources] = useState<TwinReviewAddedSource[]>([]);
  const [slateDropOpen, setSlateDropOpen] = useState(false);
  const [creditsSheetOpen, setCreditsSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [jobQueued, setJobQueued] = useState(() => Boolean(devPreview?.jobQueued));
  const [savedForLater, setSavedForLater] = useState(false);
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
  }, [devPreview?.session, session]);

  useEffect(() => {
    const credits = new URLSearchParams(window.location.search).get("credits");
    if (credits === "success") {
      setCheckoutNotice("Credits added — your scan is still here.");
    } else if (credits === "cancelled") {
      setCheckoutNotice("Checkout cancelled — your scan is still here.");
    }
  }, []);

  useEffect(() => {
    if (devPreview?.openCreditsSheet) setCreditsSheetOpen(true);
  }, [devPreview?.openCreditsSheet]);

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
  const assetCount = estimateFiles.length;

  const { estimate: liveEstimate, loading: estimateLoading, error: estimateError } =
    useTwinProcessingEstimate({
      sources: creditSources,
      frameCount,
      quality,
      enabled: !devPreview && creditSources.length > 0,
    });
  const estimate = devPreview?.estimate ?? liveEstimate;
  const estimateLoadingState = devPreview ? false : estimateLoading;

  const handleBack = useCallback(() => {
    if (submitting || upload.isRunning) return;
    if (step === "status" || jobQueued) {
      router.push("/digital-twin/twins");
      return;
    }
    if (step === "clips") {
      router.push("/digital-twin/capture");
      return;
    }
    const order: TwinSubmitStepId[] = ["clips", "sources", "quality", "confirm", "status"];
    const index = order.indexOf(step);
    if (index > 0) setStep(order[index - 1]!);
  }, [jobQueued, router, step, submitting, upload.isRunning]);

  const handleRemoveClip = useCallback((clipId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, clips: prev.clips.filter((clip) => clip.id !== clipId) };
      setTwinCapturePendingSession(next);
      return next;
    });
  }, []);

  const handleReorderClip = useCallback((clipId: string, direction: "left" | "right") => {
    setSession((prev) => {
      if (!prev) return prev;
      const index = prev.clips.findIndex((clip) => clip.id === clipId);
      if (index < 0) return prev;
      const target = direction === "left" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.clips.length) return prev;
      const clips = [...prev.clips];
      [clips[index], clips[target]] = [clips[target]!, clips[index]!];
      const next = { ...prev, clips };
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
      setStep("status");
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
    quality,
    resolveGpsFix,
    scanName,
    session,
    submitting,
    upload,
  ]);

  /**
   * Save the scan without submitting it for processing. Uploads every source
   * (so it persists as a draft capture and bridges into the project's SlateDrop
   * twin folders), but does NOT enqueue a processing job — so the user can add
   * more sources later from the desktop and submit when ready.
   */
  const handleSaveForLater = useCallback(async () => {
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
      setSavedForLater(true);
      setStep("status");
      clearTwinCapturePendingSession();
      clearTwinCaptureReviewPersistedState();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not save your scan");
    } finally {
      setSubmitting(false);
    }
  }, [
    addedSources,
    clipFiles,
    localAddedFiles,
    resolveGpsFix,
    scanName,
    session,
    submitting,
    upload,
  ]);

  const goNext = useCallback(() => {
    const order: TwinSubmitStepId[] = ["clips", "sources", "quality", "confirm", "status"];
    const index = order.indexOf(step);
    if (index >= 0 && index < order.length - 1) setStep(order[index + 1]!);
  }, [step]);

  const canAdvance =
    step === "clips"
      ? (session?.clips.length ?? 0) > 0
      : step === "sources"
        ? (session?.clips.length ?? 0) > 0
        : step === "quality"
          ? Boolean(estimate) || Boolean(estimateError)
          : false;

  return {
    session,
    sessionReady,
    step,
    setStep,
    scanName,
    setScanName,
    quality,
    setQuality,
    addedSources,
    setAddedSources,
    slateDropOpen,
    setSlateDropOpen,
    creditsSheetOpen,
    setCreditsSheetOpen,
    submitting,
    submitError,
    jobQueued,
    savedForLater,
    checkoutNotice,
    restoredNotice,
    captureCategories,
    totalDurationSeconds,
    assetCount,
    estimate,
    estimateLoadingState,
    estimateError,
    upload,
    devPreview,
    handleBack,
    handleRemoveClip,
    handleReorderClip,
    handleAddFiles,
    handleGoToTwins,
    handleCreateTwin,
    handleSaveForLater,
    goNext,
    canAdvance,
  };
}
