"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, ScanLine, Upload, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { twinMediaToAssetKind } from "@/lib/digital-twin/twin-review-media";
import { useMultipartTwinUpload } from "@/hooks/useMultipartTwinUpload";
import { useTwinGpsFix } from "@/hooks/useTwinGpsFix";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";
import { useTwinCreditEstimate } from "@/hooks/useTwinCreditEstimate";
import { CreateTwinSpaceForm } from "./CreateTwinSpaceForm";
import { TwinCreditGate } from "./TwinCreditGate";
import { TwinJobStatus } from "./TwinJobStatus";

type Props = {
  spaces: HubTwin[];
  projects: HubTwinProject[];
  initialProjectId?: string | null;
  initialCaptureId?: string | null;
  lockProject?: boolean;
};

const SCAN_EXT = /\.(las|laz|e57)$/i;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function LidarScanUploadPanel({
  spaces,
  projects,
  initialProjectId,
  initialCaptureId,
  lockProject = false,
}: Props) {
  const scopedSpaces = useMemo(
    () =>
      !lockProject || !initialProjectId
        ? spaces
        : spaces.filter((space) => space.projectId === initialProjectId),
    [initialProjectId, lockProject, spaces],
  );
  const scopedProjects = useMemo(
    () =>
      !lockProject || !initialProjectId
        ? projects
        : projects.filter((project) => project.id === initialProjectId),
    [initialProjectId, lockProject, projects],
  );
  const [localSpaces, setLocalSpaces] = useState(scopedSpaces);
  const [spaceId, setSpaceId] = useState(scopedSpaces[0]?.id ?? "");
  const [projectId, setProjectId] = useState(
    initialProjectId ?? scopedSpaces[0]?.projectId ?? scopedProjects[0]?.id ?? "",
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const selectedSpace = useMemo(
    () => localSpaces.find((space) => space.id === spaceId) ?? null,
    [localSpaces, spaceId],
  );
  const {
    files,
    captureId,
    overallProgress,
    isRunning,
    startUpload,
    abort,
    enqueueJob,
    singleMaxBytes,
  } = useMultipartTwinUpload();
  const resolveGpsFix = useTwinGpsFix();
  const { estimate: creditEstimate } = useTwinCreditEstimate(captureId, files.length > 0 && files.every((row) => row.status === "complete"));
  const allComplete = files.length > 0 && files.every((row) => row.status === "complete");

  useEffect(() => setLocalSpaces(scopedSpaces), [scopedSpaces]);

  const onSpaceChange = useCallback(
    (next: string) => {
      setSpaceId(next);
      const space = localSpaces.find((row) => row.id === next);
      if (space?.projectId) setProjectId(space.projectId);
    },
    [localSpaces],
  );

  const onFiles = useCallback((list: FileList | null) => {
    const next = Array.from(list ?? []);
    const invalid = next.find((file) => !SCAN_EXT.test(file.name));
    if (invalid) {
      setSelectedFiles([]);
      setMessage(`${invalid.name} is not a LAS, LAZ, or E57 scan`);
      return;
    }
    setSelectedFiles(next);
    setMessage(null);
  }, []);

  const handleStart = useCallback(async () => {
    if (!spaceId || !projectId || !selectedFiles.length) return;
    try {
      const gps = await resolveGpsFix();
      await startUpload(
        {
          spaceId,
          projectId,
          captureId: captureId ?? initialCaptureId ?? undefined,
          title: selectedSpace?.title ?? "Terrestrial LiDAR scan",
          gps,
          resolveAssetKind: (file) =>
            twinMediaToAssetKind(file, false, "unknown", "lidar_scan"),
        },
        selectedFiles,
      );
      setMessage("Scan upload complete. Queue processing when ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "LiDAR scan upload failed");
    }
  }, [
    captureId,
    initialCaptureId,
    projectId,
    resolveGpsFix,
    selectedFiles,
    selectedSpace?.title,
    spaceId,
    startUpload,
  ]);

  const handleEnqueue = useCallback(async () => {
    try {
      const result = await enqueueJob("lidar_potree", "standard", undefined, "lidar_scan");
      setMessage(`LiDAR processing queued (${result.job.id})`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not queue LiDAR processing");
    }
  }, [enqueueJob]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <section className="flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
        <div className="flex items-center gap-3">
          <span className={cn("flex size-10 items-center justify-center rounded-xl border", twinAccent.iconChip)}>
            <ScanLine className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100">Terrestrial LiDAR scan</h1>
            <p className="text-xs text-zinc-400">Upload LAS, LAZ, or E57 scanner exports for point-cloud analysis.</p>
          </div>
        </div>

        {localSpaces.length === 0 ? (
          <CreateTwinSpaceForm projects={scopedProjects} onCreated={(space) => {
            setLocalSpaces((prev) => [space, ...prev]);
            setSpaceId(space.id);
            setProjectId(space.projectId ?? "");
          }} />
        ) : (
          <>
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Twin workspace
              <select value={spaceId} onChange={(event) => onSpaceChange(event.target.value)} className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100">
                {localSpaces.map((space) => <option key={space.id} value={space.id}>{space.title}</option>)}
              </select>
            </label>
            <p className="text-xs leading-relaxed text-zinc-500">
              Files over {formatBytes(singleMaxBytes)} use resumable multipart upload. Multiple scans are registered together.
            </p>
            <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 text-center">
              <Upload className="size-5 text-zinc-400" aria-hidden />
              <span className="text-sm text-zinc-300">Choose LAS, LAZ, or E57 files</span>
              <span className="text-xs text-zinc-500">The dedicated source role is preserved through upload and dispatch.</span>
              <input type="file" multiple accept=".las,.laz,.e57" className="sr-only" disabled={isRunning} onChange={(event) => onFiles(event.target.files)} />
            </label>
            {selectedFiles.length ? (
              <ul className="space-y-1 text-xs text-zinc-400">
                {selectedFiles.map((file) => <li key={`${file.name}-${file.size}`} className="flex justify-between gap-2"><span className="truncate text-zinc-200">{file.name}</span><span>{formatBytes(file.size)}</span></li>)}
              </ul>
            ) : null}
            {files.length ? <p className="text-xs text-zinc-400">Upload progress <span className={twinAccent.text}>{overallProgress}%</span></p> : null}
            <div className="flex gap-2">
              <button type="button" disabled={isRunning || !selectedFiles.length} onClick={() => void handleStart()} className={cn(twinAccent.button, "min-h-[44px] flex-1")}>
                {isRunning ? <><Loader2 className="mr-2 inline size-4 animate-spin" />Uploading…</> : "Start scan upload"}
              </button>
              {isRunning ? <button type="button" onClick={() => void abort()} className={twinAccent.buttonDanger} aria-label="Abort upload"><XCircle className="size-4" /></button> : null}
            </div>
            {allComplete && captureId ? <TwinCreditGate captureId={captureId} enabled={allComplete} /> : null}
            {allComplete && captureId ? <button type="button" disabled={!creditEstimate?.sufficient} onClick={() => void handleEnqueue()} className={cn(twinAccent.button, "min-h-[44px] w-full")}>Process LiDAR scan</button> : null}
            {captureId ? <TwinJobStatus captureId={captureId} spaceId={spaceId} /> : null}
          </>
        )}
        {message ? <p className="text-xs text-zinc-300">{message}</p> : null}
        <Link href="/digital-twin/upload" className={cn("text-center text-xs", twinAccent.link)}>Back to visual uploads</Link>
      </section>
    </div>
  );
}
