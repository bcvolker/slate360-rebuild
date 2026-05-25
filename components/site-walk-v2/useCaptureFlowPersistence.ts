"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CaptureClassification, CaptureStopSummary, MarkupTool } from "./capture-flow-types";
import { buildCaptureSummaryFinishedUrl } from "@/lib/site-walk/capture-v2-config";
import { resolveCaptureDraftPreviewUrl } from "@/lib/site-walk-v2/capture-photo-upload";
import { finalizeCaptureV2Walk } from "@/lib/site-walk-v2/finalize-capture-v2-walk";
import {
  CAPTURE_V2_STOP_DRAFTS_KEY,
  draftPayloadsEqual,
  EMPTY_STOP_DRAFT,
  loadCaptureV2StopDraftStore,
  persistCaptureV2StopDraftStore,
  type CaptureStopDraftPayload,
  type CaptureV2StopDraftStore,
} from "@/lib/site-walk-v2/capture-stop-drafts";

type Args = {
  sessionId: string;
  stops: CaptureStopSummary[];
  initialStopIndex?: number;
};

type SaveState = "idle" | "saving" | "finishing" | "error";

function applyDraft(draft: CaptureStopDraftPayload) {
  return {
    notes: draft.notes,
    classification: draft.classification,
    photoS3Key: draft.photoS3Key,
    photoFileId: draft.photoFileId,
    pinPct: draft.pinPct,
    markupCount: draft.markupCount,
  };
}

export function useCaptureFlowPersistence({ sessionId, stops, initialStopIndex = 0 }: Args) {
  const router = useRouter();
  const [stopIndex, setStopIndex] = useState(initialStopIndex);
  const [stopStates, setStopStates] = useState(stops);
  const [notes, setNotes] = useState("");
  const [classification, setClassification] = useState<CaptureClassification | null>(null);
  const [photoS3Key, setPhotoS3Key] = useState<string | null>(null);
  const [photoFileId, setPhotoFileId] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [markupTool, setMarkupTool] = useState<MarkupTool>("pin");
  const [pinPct, setPinPct] = useState<{ x: number; y: number } | null>(null);
  const [markupCount, setMarkupCount] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const metadataRef = useRef<Record<string, unknown>>({});
  const storeRef = useRef<CaptureV2StopDraftStore | null>(null);
  const savedSnapshotRef = useRef<CaptureStopDraftPayload>(EMPTY_STOP_DRAFT);
  const previewObjectUrlRef = useRef<string | null>(null);

  const currentStop = stopStates[stopIndex] ?? stopStates[0];
  const currentPayload = useMemo(
    (): CaptureStopDraftPayload => ({
      notes,
      classification,
      photoS3Key,
      photoFileId,
      pinPct,
      markupCount,
    }),
    [notes, classification, photoS3Key, photoFileId, pinPct, markupCount],
  );
  const isDirty = hydrated && !draftPayloadsEqual(currentPayload, savedSnapshotRef.current);

  const revokePreviewObjectUrl = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }, []);

  const setPhotoUpload = useCallback(
    (upload: { s3Key: string; fileId: string | null; previewUrl: string }) => {
      revokePreviewObjectUrl();
      previewObjectUrlRef.current = upload.previewUrl.startsWith("blob:") ? upload.previewUrl : null;
      setPhotoS3Key(upload.s3Key);
      setPhotoFileId(upload.fileId);
      setPhotoPreviewUrl(upload.previewUrl);
    },
    [revokePreviewObjectUrl],
  );

  const resolveDraftPreview = useCallback(async (fileId: string | null, s3Key: string | null) => {
    if (fileId) {
      const url = await resolveCaptureDraftPreviewUrl(fileId);
      if (url) {
        setPhotoPreviewUrl(url);
        return;
      }
    }
    setPhotoPreviewUrl(s3Key);
  }, []);

  const loadStopDraft = useCallback(
    (index: number, store: CaptureV2StopDraftStore) => {
      const stop = stops[index];
      if (!stop) return;
      const draft = store.stops[stop.id] ?? {
        ...EMPTY_STOP_DRAFT,
        stopId: stop.id,
        complete: stop.complete,
        savedAt: "",
      };
      const next = applyDraft(draft);
      revokePreviewObjectUrl();
      setNotes(next.notes);
      setClassification(next.classification);
      setPhotoS3Key(next.photoS3Key);
      setPhotoFileId(next.photoFileId);
      setPhotoPreviewUrl(null);
      setPinPct(next.pinPct);
      setMarkupCount(next.markupCount);
      savedSnapshotRef.current = { ...next };
      setStopIndex(index);
      void resolveDraftPreview(next.photoFileId, next.photoS3Key);
    },
    [resolveDraftPreview, revokePreviewObjectUrl, stops],
  );

  useEffect(() => {
    let cancelled = false;
    void loadCaptureV2StopDraftStore(sessionId)
      .then(({ store, metadata }) => {
        if (cancelled) return;
        metadataRef.current = metadata;
        storeRef.current = store;
        setStopStates(
          stops.map((stop) => ({
            ...stop,
            complete: store.stops[stop.id]?.complete ?? stop.complete,
          })),
        );
        const index = Math.min(Math.max(store.currentStopIndex, 0), stops.length - 1);
        loadStopDraft(index, store);
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
      revokePreviewObjectUrl();
    };
  }, [sessionId, stops, loadStopDraft, revokePreviewObjectUrl]);

  const persistCurrentStop = useCallback(
    async (markComplete: boolean) => {
      const stop = stops[stopIndex];
      if (!stop) return;
      setSaveState("saving");
      setSaveError(null);
      const store = storeRef.current ?? {
        version: 1 as const,
        currentStopIndex: stopIndex,
        stops: {},
        updatedAt: new Date().toISOString(),
      };
      const savedAt = new Date().toISOString();
      store.stops[stop.id] = {
        stopId: stop.id,
        ...currentPayload,
        complete: markComplete ? true : (store.stops[stop.id]?.complete ?? false),
        savedAt,
      };
      store.currentStopIndex = stopIndex;
      try {
        await persistCaptureV2StopDraftStore(sessionId, store, metadataRef.current);
        storeRef.current = store;
        savedSnapshotRef.current = { ...currentPayload };
        setStopStates((prev) =>
          prev.map((item, idx) =>
            idx === stopIndex ? { ...item, complete: store.stops[stop.id]?.complete ?? item.complete } : item,
          ),
        );
        setSaveState("idle");
        return store;
      } catch (error) {
        setSaveState("error");
        setSaveError(error instanceof Error ? error.message : "Could not save this stop");
        return null;
      }
    },
    [currentPayload, sessionId, stopIndex, stops],
  );

  const switchToStop = useCallback(
    async (index: number) => {
      if (index === stopIndex) return;
      if (isDirty) {
        const discard = window.confirm(
          "You have unsaved changes on this stop. Switch anyway? Unsaved edits will be lost.",
        );
        if (!discard) return;
      }
      const store = storeRef.current;
      if (store) loadStopDraft(index, store);
      else setStopIndex(index);
    },
    [isDirty, loadStopDraft, stopIndex],
  );

  const finishWalk = useCallback(
    async (storeOverride?: CaptureV2StopDraftStore) => {
      const store = storeOverride ?? storeRef.current;
      if (!store) {
        throw new Error("Walk data was not loaded. Close and reopen capture, then try again.");
      }

      setSaveState("finishing");
      setSaveError(null);

      try {
        const stopLabels = Object.fromEntries(stops.map((stop) => [stop.id, stop.label]));
        const { promotedCount, metadata } = await finalizeCaptureV2Walk({
          sessionId,
          store,
          metadata: metadataRef.current,
          stopLabels,
        });
        metadataRef.current = metadata;
        delete metadataRef.current[CAPTURE_V2_STOP_DRAFTS_KEY];
        storeRef.current = null;
        router.push(buildCaptureSummaryFinishedUrl(sessionId, promotedCount));
      } catch (error) {
        setSaveState("error");
        setSaveError(error instanceof Error ? error.message : "Could not finish walk");
        throw error;
      }
    },
    [router, sessionId, stops],
  );

  const handleSaveAndNext = useCallback(async () => {
    const store = await persistCurrentStop(true);
    if (!store) return;
    const nextIndex = stopIndex + 1;
    if (nextIndex >= stops.length) {
      try {
        await finishWalk(store);
      } catch {
        // saveState/saveError already set in finishWalk
      }
      return;
    }
    store.currentStopIndex = nextIndex;
    storeRef.current = store;
    loadStopDraft(nextIndex, store);
  }, [finishWalk, loadStopDraft, persistCurrentStop, stopIndex, stops.length]);

  const handleStopSelect = useCallback(
    (_stopId: string, index: number) => {
      void switchToStop(index);
    },
    [switchToStop],
  );

  const clearSaveError = useCallback(() => {
    setSaveError(null);
    if (saveState === "error") setSaveState("idle");
  }, [saveState]);

  return {
    stopIndex,
    stopLabel: currentStop?.label ?? `Stop ${stopIndex + 1}`,
    stops: stopStates,
    notes,
    setNotes,
    classification,
    setClassification,
    photoPreviewUrl,
    setPhotoUpload,
    markupTool,
    setMarkupTool,
    pinPct,
    setPinPct,
    markupCount,
    setMarkupCount,
    isDirty,
    hydrated,
    saveState,
    saveError,
    clearSaveError,
    handleSaveAndNext,
    handleStopSelect,
  };
}
