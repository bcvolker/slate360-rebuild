"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Pause, Play, Upload, XCircle } from "lucide-react";
import { mobileTokens } from "@/components/mobile-system";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
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
  lockProject?: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TwinUploadPanel({
  spaces,
  projects,
  initialProjectId,
  lockProject = false,
}: Props) {
  const scopedSpaces = useMemo(() => {
    if (!lockProject || !initialProjectId) return spaces;
    return spaces.filter((space) => space.projectId === initialProjectId);
  }, [initialProjectId, lockProject, spaces]);

  const scopedProjects = useMemo(() => {
    if (!lockProject || !initialProjectId) return projects;
    return projects.filter((project) => project.id === initialProjectId);
  }, [initialProjectId, lockProject, projects]);

  const [localSpaces, setLocalSpaces] = useState(scopedSpaces);
  const [spaceId, setSpaceId] = useState(scopedSpaces[0]?.id ?? "");
  const [projectId, setProjectId] = useState(
    initialProjectId ?? scopedSpaces[0]?.projectId ?? scopedProjects[0]?.id ?? "",
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    setLocalSpaces(scopedSpaces);
  }, [scopedSpaces]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const {
    files,
    captureId,
    overallProgress,
    isRunning,
    startUpload,
    pause,
    resume,
    abort,
    enqueueJob,
    singleMaxBytes,
  } = useMultipartTwinUpload();

  const resolveGpsFix = useTwinGpsFix();

  const selectedSpace = useMemo(
    () => localSpaces.find((row) => row.id === spaceId) ?? null,
    [localSpaces, spaceId],
  );

  const onSpaceChange = useCallback(
    (nextSpaceId: string) => {
      setSpaceId(nextSpaceId);
      const space = localSpaces.find((row) => row.id === nextSpaceId);
      if (space?.projectId) setProjectId(space.projectId);
    },
    [localSpaces],
  );

  const handleSpaceCreated = useCallback((space: HubTwin) => {
    setLocalSpaces((prev) => [space, ...prev.filter((row) => row.id !== space.id)]);
    setSpaceId(space.id);
    if (space.projectId) setProjectId(space.projectId);
  }, []);

  const onFileChange = useCallback((list: FileList | null) => {
    if (!list?.length) return;
    setSelectedFiles(Array.from(list));
    setStatusMessage(null);
  }, []);

  const canUpload = Boolean(spaceId && projectId && selectedFiles.length && !isRunning);

  const handleStart = useCallback(async () => {
    if (!spaceId || !projectId || !selectedFiles.length) return;
    setStatusMessage(null);

    try {
      const gps = await resolveGpsFix();
      await startUpload(
        {
          spaceId,
          projectId,
          title: selectedSpace?.title ?? "Phone upload",
          gps,
        },
        selectedFiles,
      );
      setStatusMessage("Upload complete. Queue processing when ready.");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Upload failed");
    }
  }, [projectId, resolveGpsFix, selectedFiles, selectedSpace?.title, spaceId, startUpload]);

  const handleEnqueue = useCallback(async () => {
    try {
      const result = await enqueueJob("spz");
      setStatusMessage(`Processing job queued (${result.job.id})`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to queue job");
    }
  }, [enqueueJob]);

  const allComplete = files.length > 0 && files.every((row) => row.status === "complete");
  const { estimate: creditEstimate } = useTwinCreditEstimate(captureId, allComplete);
  const canQueue = allComplete && (creditEstimate?.sufficient ?? false);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
              twinAccent.iconChip,
            )}
          >
            <Upload className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-100">Upload Assets</h2>
            <p className="text-xs text-zinc-400">
              Phone files, camera roll, or field uploads for this twin
            </p>
          </div>
        </div>

        {localSpaces.length === 0 ? (
          <CreateTwinSpaceForm
            projects={scopedProjects}
            lockedProjectId={lockProject ? initialProjectId ?? undefined : undefined}
            onCreated={handleSpaceCreated}
          />
        ) : (
          <>
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Twin workspace
              <select
                value={spaceId}
                onChange={(e) => onSpaceChange(e.target.value)}
                className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100"
                disabled={isRunning}
              >
                {localSpaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.title}
                    {space.projectName ? ` · ${space.projectName}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-[13px] leading-relaxed text-zinc-400">
              Files over {formatBytes(singleMaxBytes)} use resumable multipart upload to R2.
            </p>

            <label
              className={cn(
                "inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-semibold",
                mobileTokens.mobilePrimaryButton,
                mobileTokens.focusRing,
                isRunning && "pointer-events-none opacity-60",
              )}
            >
              Choose files
              {/* Accept any file kind — drone, 360, LiDAR/point-cloud, mesh, GPS,
                  hi-res stills. Classification happens after upload, so users can
                  drop everything from one place rather than per-format pickers. */}
              <input
                type="file"
                multiple
                className="sr-only"
                disabled={isRunning}
                onChange={(event) => onFileChange(event.target.files)}
              />
            </label>

            {selectedFiles.length > 0 ? (
              <ul className="space-y-1 text-xs text-zinc-400">
                {selectedFiles.map((file) => (
                  <li key={`${file.name}-${file.size}`} className="flex justify-between gap-2">
                    <span className="truncate text-zinc-200">{file.name}</span>
                    <span className="shrink-0">{formatBytes(file.size)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {files.length > 0 ? (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                  <span className="text-zinc-400">Overall progress</span>
                  <span className={twinAccent.text}>{overallProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-xl bg-white/[0.06]">
                  <div
                    className="h-full rounded-xl bg-[var(--twin360-blue)] transition-[width] duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <ul className="mt-3 space-y-1.5">
                  {files.map((row) => (
                    <li key={row.file.name} className="flex items-center justify-between text-xs">
                      <span className="truncate text-zinc-300">{row.file.name}</span>
                      <span className={twinAccent.textMuted}>{row.progress}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={!canUpload}
                className={cn(twinAccent.button, "min-h-[44px] flex-1")}
              >
                {isRunning ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
                  </span>
                ) : (
                  "Start upload"
                )}
              </button>
              {isRunning ? (
                <>
                  <button type="button" onClick={pause} className={twinAccent.button} aria-label="Pause">
                    <Pause className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={resume} className={twinAccent.button} aria-label="Resume">
                    <Play className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void abort()}
                    className={twinAccent.buttonDanger}
                    aria-label="Abort"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </div>

            {allComplete && captureId ? (
              <TwinCreditGate captureId={captureId} enabled={allComplete} />
            ) : null}

            {allComplete && captureId ? (
              <button
                type="button"
                onClick={() => void handleEnqueue()}
                disabled={!canQueue}
                className={cn(twinAccent.button, "w-full min-h-[44px]")}
              >
                Queue processing job
              </button>
            ) : null}

            {captureId ? (
              <p className="text-xs text-zinc-500">
                Capture <span className="font-mono text-zinc-400">{captureId.slice(0, 8)}…</span>
              </p>
            ) : null}

            {captureId ? <TwinJobStatus captureId={captureId} spaceId={spaceId} /> : null}

            {statusMessage ? <p className="text-xs text-zinc-300">{statusMessage}</p> : null}

            <CreateTwinSpaceForm projects={projects} onCreated={handleSpaceCreated} />
          </>
        )}

        <Link href="/digital-twin/twins" className={cn("text-center text-xs", twinAccent.link)}>
          Go to My Twins
        </Link>
      </div>
    </div>
  );
}
