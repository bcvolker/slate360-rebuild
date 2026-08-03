"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useEquirectHints } from "@/components/digital-twin/useEquirectHints";
import { useMultipartTwinUpload } from "@/hooks/useMultipartTwinUpload";
import { useTwinGpsFix } from "@/hooks/useTwinGpsFix";
import { useTwinJobRealtime } from "@/hooks/useTwinJobRealtime";
import {
  getTwinCapturePendingSession,
  setTwinCapturePendingSession,
  type TwinCapturePendingSession,
  type TwinReviewAddedSource,
} from "@/lib/digital-twin/twin-capture-pending-session";
import {
  persistTwinCaptureReviewState,
  restoreTwinCaptureReviewState,
} from "@/lib/digital-twin/twin-capture-pending-persist";
import {
  assetKindForChip,
  type TwinSourceChip,
} from "@/lib/digital-twin/twin-source-chip";
import {
  buildReviewSources,
  estimateFrameCount,
  reviewFileKey,
} from "@/lib/digital-twin/review-source-builders";
import type {
  TwinReviewInitialCapture,
  TwinReviewTarget,
} from "@/lib/digital-twin/review-source-types";
import type { TwinJobCreditEstimate } from "@/lib/twin/processing-estimate-types";
import { useTwinProcessingEstimate } from "@/hooks/useTwinProcessingEstimate";
import { useM1ReviewProcess } from "@/hooks/useM1ReviewProcess";
import { useM1ReviewSourceActions } from "@/hooks/useM1ReviewSourceActions";

export type M1ReviewDevPreview = {
  estimate: TwinJobCreditEstimate;
  session?: TwinCapturePendingSession;
  jobQueued?: boolean;
  mockCaptureId?: string;
};

type Props = {
  initialCapture?: TwinReviewInitialCapture;
  initialTarget?: TwinReviewTarget;
  allowPendingSession?: boolean;
  devPreview?: M1ReviewDevPreview;
};

type ProcessState = "idle" | "uploading" | "processing";

export function useM1ReviewSources({
  initialCapture,
  initialTarget,
  allowPendingSession = true,
  devPreview,
}: Props) {
  const router = useRouter();
  const upload = useMultipartTwinUpload();
  const resolveGpsFix = useTwinGpsFix();
  const shouldLoadPending = allowPendingSession && !initialCapture && !initialTarget;
  const initialSession = shouldLoadPending
    ? devPreview?.session ?? getTwinCapturePendingSession()
    : devPreview?.session ?? null;
  const [session, setSession] = useState<TwinCapturePendingSession | null>(initialSession);
  const [sessionReady, setSessionReady] = useState(Boolean(initialSession || !shouldLoadPending));
  const [addedSources, setAddedSources] = useState<TwinReviewAddedSource[]>([]);
  const [chipOverrides, setChipOverrides] = useState<Record<string, TwinSourceChip>>({});
  const [changedAssetIds, setChangedAssetIds] = useState<Set<string>>(new Set());
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState(
    initialCapture?.title ?? initialTarget?.title ?? initialSession?.selection.spaceTitle ?? "Quick scan",
  );
  const [captureId, setCaptureId] = useState<string | null>(
    initialCapture?.captureId ?? (devPreview?.jobQueued ? devPreview.mockCaptureId ?? null : null),
  );
  const [processState, setProcessState] = useState<ProcessState>("idle");
  const [processRequested, setProcessRequested] = useState(Boolean(devPreview?.jobQueued));
  const [processError, setProcessError] = useState<string | null>(null);
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldLoadPending || session || devPreview?.session) {
      setSessionReady(true);
      return;
    }
    let cancelled = false;
    void restoreTwinCaptureReviewState().then((restored) => {
      if (cancelled) return;
      if (restored) {
        setSession(restored.session);
        setTitle(restored.scanName);
        setAddedSources(restored.addedSources);
        setTwinCapturePendingSession(restored.session);
      }
      setSessionReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [devPreview?.session, session, shouldLoadPending]);

  useEffect(() => {
    for (const row of upload.files) {
      if (row.status !== "complete") continue;
      setCompletedKeys((prev) => {
        const key = reviewFileKey(row.file);
        if (prev.has(key)) return prev;
        return new Set(prev).add(key);
      });
    }
  }, [upload.files]);

  const localFiles = useMemo(
    () => [
      ...(session?.clips ?? []).flatMap((clip) => clip.files),
      ...(session?.lidarFiles ?? []),
      ...addedSources.flatMap((source) => (source.origin === "slatedrop" ? [] : [source.file])),
    ],
    [addedSources, session?.clips, session?.lidarFiles],
  );
  const hints = useEquirectHints(localFiles);
  const sources = useMemo(
    () =>
      buildReviewSources({
        session,
        addedSources,
        assets: initialCapture?.assets ?? [],
        hints,
        overrides: chipOverrides,
        uploadRows: upload.files,
        completedKeys,
      }),
    [addedSources, chipOverrides, completedKeys, hints, initialCapture?.assets, session, upload.files],
  );
  const target = useMemo<TwinReviewTarget | null>(() => {
    if (initialCapture) return initialCapture;
    if (session) {
      return {
        spaceId: session.selection.spaceId,
        projectId: session.selection.projectId,
        title,
      };
    }
    return initialTarget ?? null;
  }, [initialCapture, initialTarget, session, title]);
  const sourceAssets = useMemo(
    () =>
      sources.map((source) => ({
        asset_kind: assetKindForChip(source.chip, { name: source.name, type: source.contentType }),
        file_size_bytes: source.sizeBytes,
      })),
    [sources],
  );
  const frameCount = useMemo(() => estimateFrameCount(sources), [sources]);
  const liveEstimate = useTwinProcessingEstimate({
    sources: sourceAssets,
    frameCount,
    quality: "standard",
    enabled: sessionReady && sources.length > 0,
  });
  const estimate = devPreview?.estimate ?? liveEstimate.estimate;
  const estimateLoading = devPreview ? false : liveEstimate.loading;
  const estimateError = devPreview ? null : liveEstimate.error;
  const realtime = useTwinJobRealtime(captureId);

  const persistReview = useCallback(
    (nextAddedSources: TwinReviewAddedSource[]) => {
      if (!session || !shouldLoadPending) return;
      void persistTwinCaptureReviewState({
        session,
        scanName: title,
        quality: "standard",
        addedSources: nextAddedSources,
      });
    },
    [session, shouldLoadPending, title],
  );

  const sourceActions = useM1ReviewSourceActions({
    captureId,
    sources,
    persistReview,
    setAddedSources,
    setChipOverrides,
    setChangedAssetIds,
    setSourceNotice,
  });
  const handleProcess = useM1ReviewProcess({
    upload,
    processState,
    target,
    sources,
    addedSources,
    captureId,
    title,
    estimateSufficient: estimate?.sufficient,
    changedAssetIds,
    completedKeys,
    resolveGpsFix,
    setCaptureId,
    setProcessState,
    setProcessRequested,
    setProcessError,
  });

  const handleRetry = useCallback(() => {
    setProcessRequested(false);
    setProcessError(null);
    setProcessState("idle");
  }, []);

  const handleBack = useCallback(() => {
    router.push(session ? "/digital-twin/capture" : "/digital-twin");
  }, [router, session]);

  const persistedPending = sources.some((source) => source.assetId && source.status === "uploading");
  const canProcess = Boolean(
    sessionReady &&
      target &&
      sources.length &&
      estimate?.sufficient &&
      !persistedPending &&
      processState === "idle" &&
      !processRequested,
  );

  return {
    session,
    sessionReady,
    title,
    target,
    sources,
    estimate,
    estimateLoading,
    estimateError,
    processError,
    sourceNotice,
    processState,
    processRequested,
    job: realtime.job,
    captureId,
    initialCaptureStatus: initialCapture?.captureStatus ?? "draft",
    canProcess,
    ...sourceActions,
    handleProcess,
    handleRetry,
    handleBack,
  };
}
