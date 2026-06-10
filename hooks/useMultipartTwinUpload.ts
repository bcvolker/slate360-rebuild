"use client";

import { useCallback, useRef, useState } from "react";
import {
  TWIN_MULTIPART_PART_BYTES,
  TWIN_SINGLE_UPLOAD_MAX_BYTES,
} from "@/lib/twin/upload-constants";
import { twinApiPost } from "@/hooks/twin-upload-api";
import { runMultipartTwinUpload, runSingleTwinUpload } from "@/hooks/twin-upload-runners";
import type { TwinProcessingQuality } from "@/lib/twin/processing-estimate-types";

export type TwinGpsFix = {
  lat: number;
  lng: number;
  alt?: number;
  accuracy?: number;
};

export type TwinUploadTarget = {
  spaceId: string;
  projectId: string;
  captureId?: string;
  title?: string;
  gps?: TwinGpsFix;
};

export type TwinFileUploadState = {
  file: File;
  assetId?: string;
  uploadId?: string;
  key?: string;
  progress: number;
  status: "pending" | "uploading" | "paused" | "complete" | "error" | "aborted";
  error?: string;
};

export function useMultipartTwinUpload() {
  const [files, setFiles] = useState<TwinFileUploadState[]>([]);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const pausedRef = useRef(false);
  const abortedRef = useRef(false);

  const updateFile = useCallback((index: number, patch: Partial<TwinFileUploadState>) => {
    setFiles((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const recomputeOverall = useCallback((rows: TwinFileUploadState[]) => {
    if (!rows.length) {
      setOverallProgress(0);
      return;
    }
    setOverallProgress(Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length));
  }, []);

  const runnerCtx = useCallback(
    () => ({
      captureId,
      pausedRef,
      abortedRef,
      updateFile,
      setCaptureId,
    }),
    [captureId, updateFile],
  );

  const startUpload = useCallback(
    async (target: TwinUploadTarget, selected: File[]) => {
      if (!selected.length) return null;

      pausedRef.current = false;
      abortedRef.current = false;
      setIsRunning(true);

      const initialRows: TwinFileUploadState[] = selected.map((file) => ({
        file,
        progress: 0,
        status: "pending",
      }));
      setFiles(initialRows);
      recomputeOverall(initialRows);

      const multipartCandidates = selected.filter((f) => f.size > TWIN_SINGLE_UPLOAD_MAX_BYTES);
      const singleCandidates = selected.filter((f) => f.size <= TWIN_SINGLE_UPLOAD_MAX_BYTES);
      let resolvedCaptureId = target.captureId ?? captureId ?? "";
      const ctx = runnerCtx();

      try {
        if (multipartCandidates.length) {
          const init = await twinApiPost<{
            captureId: string;
            uploads: {
              assetId: string;
              uploadId: string;
              key: string;
              partSizeBytes: number;
              totalParts: number;
            }[];
          }>("/api/digital-twin/upload/init", {
            space_id: target.spaceId,
            project_id: target.projectId,
            capture_id: target.captureId ?? captureId ?? undefined,
            title: target.title,
            gps: target.gps,
            files: multipartCandidates.map((file) => ({
              filename: file.name,
              contentType: file.type || "application/octet-stream",
              sizeBytes: file.size,
            })),
          });

          resolvedCaptureId = init.captureId;
          setCaptureId(init.captureId);

          for (let i = 0; i < multipartCandidates.length; i++) {
            const file = multipartCandidates[i];
            const index = selected.indexOf(file);
            const initRow = init.uploads[i];
            if (!initRow) continue;

            updateFile(index, {
              assetId: initRow.assetId,
              uploadId: initRow.uploadId,
              key: initRow.key,
            });
            if (abortedRef.current) break;
            await runMultipartTwinUpload(ctx, file, index, initRow, init.captureId);
          }
        }

        for (const file of singleCandidates) {
          if (abortedRef.current) break;
          await runSingleTwinUpload(ctx, target, file, selected.indexOf(file), selected.indexOf(file));
        }

        setFiles((prev) => {
          recomputeOverall(prev);
          return prev;
        });
        return resolvedCaptureId;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setFiles((prev) =>
          prev.map((row) => (row.status === "complete" ? row : { ...row, status: "error", error: message })),
        );
        throw err;
      } finally {
        setIsRunning(false);
      }
    },
    [captureId, recomputeOverall, runnerCtx, updateFile],
  );

  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setFiles((prev) =>
      prev.map((row) => (row.status === "paused" ? { ...row, status: "uploading" } : row)),
    );
  }, []);

  const abort = useCallback(async () => {
    abortedRef.current = true;
    pausedRef.current = false;

    await Promise.all(
      files
        .filter((row) => row.uploadId && row.key && row.status !== "complete")
        .map(async (row) => {
          try {
            await twinApiPost("/api/digital-twin/upload/abort", {
              uploadId: row.uploadId,
              key: row.key,
            });
          } catch {
            // best-effort
          }
        }),
    );

    setFiles((prev) =>
      prev.map((row) => (row.status === "complete" ? row : { ...row, status: "aborted", progress: 0 })),
    );
    setIsRunning(false);
  }, [files]);

  const enqueueJob = useCallback(
    async (
      outputFormat: "spz" | "ply" | "glb" = "spz",
      quality: TwinProcessingQuality = "standard",
    ) => {
      if (!captureId) throw new Error("No capture id — upload assets first");
      return twinApiPost<{ job: { id: string; status: string; progress_pct: number } }>(
        "/api/digital-twin/jobs",
        { capture_id: captureId, output_format: outputFormat, quality },
      );
    },
    [captureId],
  );

  return {
    files,
    captureId,
    overallProgress,
    isRunning,
    startUpload,
    pause,
    resume,
    abort,
    enqueueJob,
    multipartPartBytes: TWIN_MULTIPART_PART_BYTES,
    singleMaxBytes: TWIN_SINGLE_UPLOAD_MAX_BYTES,
  };
}
