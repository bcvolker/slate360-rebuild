"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { useMultipartTwinUpload, type TwinGpsFix } from "@/hooks/useMultipartTwinUpload";
import { fetchSlateDropFileAsBlob } from "@/lib/digital-twin/twin-review-fetch";
import {
  clearTwinCapturePendingSession,
  type TwinReviewAddedSource,
} from "@/lib/digital-twin/twin-capture-pending-session";
import { clearTwinCaptureReviewPersistedState } from "@/lib/digital-twin/twin-capture-pending-persist";
import {
  assetKindForChip,
  deriveJobType,
  type TwinSourceChip,
} from "@/lib/digital-twin/twin-source-chip";
import { reviewFileKey } from "@/lib/digital-twin/review-source-builders";
import type {
  TwinReviewSource,
  TwinReviewTarget,
} from "@/lib/digital-twin/review-source-types";

type UploadController = ReturnType<typeof useMultipartTwinUpload>;
type ProcessState = "idle" | "uploading" | "processing";

type Args = {
  upload: UploadController;
  processState: ProcessState;
  target: TwinReviewTarget | null;
  sources: TwinReviewSource[];
  addedSources: TwinReviewAddedSource[];
  captureId: string | null;
  title: string;
  estimateSufficient: boolean | undefined;
  changedAssetIds: Set<string>;
  completedKeys: Set<string>;
  resolveGpsFix: () => Promise<TwinGpsFix | undefined>;
  setCaptureId: Dispatch<SetStateAction<string | null>>;
  setProcessState: Dispatch<SetStateAction<ProcessState>>;
  setProcessRequested: Dispatch<SetStateAction<boolean>>;
  setProcessError: Dispatch<SetStateAction<string | null>>;
};

export function useM1ReviewProcess({
  upload,
  processState,
  target,
  sources,
  addedSources,
  captureId,
  title,
  estimateSufficient,
  changedAssetIds,
  completedKeys,
  resolveGpsFix,
  setCaptureId,
  setProcessState,
  setProcessRequested,
  setProcessError,
}: Args) {
  return useCallback(async () => {
    if (processState !== "idle" || !target || !sources.length) return;
    if (!estimateSufficient) {
      setProcessError("More credits are needed before this twin can be processed.");
      return;
    }
    if (sources.some((source) => source.assetId && source.status === "uploading")) {
      setProcessError("A source is still being added. Please wait for it to finish.");
      return;
    }

    setProcessState("uploading");
    setProcessError(null);
    try {
      await persistChangedAssetChips(captureId, changedAssetIds, sources);
      const entries = await collectUploadEntries(sources, addedSources);
      const filesToUpload = entries
        .filter(({ file }) => !completedKeys.has(reviewFileKey(file)))
        .map(({ file }) => file);
      const sourceByFile = new Map(entries.map((entry) => [entry.file, entry.source]));
      let nextCaptureId = captureId;

      if (filesToUpload.length) {
        nextCaptureId = await upload.startUpload(
          {
            spaceId: target.spaceId,
            projectId: target.projectId,
            captureId: nextCaptureId ?? undefined,
            title,
            gps: await resolveGpsFix(),
            resolveAssetKind: (file) => {
              const source = sourceByFile.get(file);
              return source
                ? assetKindForChip(source.chip, { name: file.name, type: file.type })
                : undefined;
            },
          },
          filesToUpload,
        );
        setCaptureId(nextCaptureId);
      }

      if (!nextCaptureId) throw new Error("No capture was created for these sources.");
      setProcessState("processing");
      const job = deriveJobType(sources.map((source) => source.chip));
      await upload.enqueueJob(job.outputFormat, "standard", nextCaptureId, job.jobType);
      setProcessRequested(true);
      clearTwinCapturePendingSession();
      clearTwinCaptureReviewPersistedState();
    } catch (error) {
      setProcessState("idle");
      setProcessError(toReviewProcessError(error));
    }
  }, [
    addedSources,
    captureId,
    changedAssetIds,
    completedKeys,
    estimateSufficient,
    processState,
    resolveGpsFix,
    setCaptureId,
    setProcessError,
    setProcessRequested,
    setProcessState,
    sources,
    target,
    title,
    upload,
  ]);
}

function toReviewProcessError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/upload|storage|part|signed|etag/i.test(message)) {
    return "We couldn't add all sources. Tap Process twin again to continue from where we stopped.";
  }
  return message || "Could not start this twin.";
}

async function collectUploadEntries(
  sources: TwinReviewSource[],
  addedSources: TwinReviewAddedSource[],
): Promise<{ file: File; source: TwinReviewSource }[]> {
  const entries: { file: File; source: TwinReviewSource }[] = [];
  for (const source of sources) {
    if (source.file) {
      entries.push({ file: source.file, source });
      continue;
    }
    const added = addedSources.find((row) => row.id === source.id);
    if (added?.origin !== "slatedrop") continue;
    const blob = await fetchSlateDropFileAsBlob(added.pickerFile);
    entries.push({
      source,
      file: new File([blob], added.pickerFile.name, {
        type: added.pickerFile.type || "application/octet-stream",
      }),
    });
  }
  return entries;
}

async function persistChangedAssetChips(
  captureId: string | null,
  changedAssetIds: Set<string>,
  sources: TwinReviewSource[],
): Promise<void> {
  if (!captureId || !changedAssetIds.size) return;
  const changedSources = sources.filter((source) => source.assetId && changedAssetIds.has(source.assetId));
  for (const source of changedSources) {
    const response = await fetch(
      `/api/digital-twin/captures/${encodeURIComponent(captureId)}/assets/${encodeURIComponent(source.assetId!)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chip: source.chip }),
      },
    );
    if (!response.ok) throw new Error("Could not save all source types.");
  }
}
