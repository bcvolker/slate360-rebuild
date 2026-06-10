"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconLoader2 } from "@tabler/icons-react";
import { formatQuickScanSpaceTitle } from "@/lib/digital-twin/quick-scan-title";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
import { useMultipartTwinUpload } from "@/hooks/useMultipartTwinUpload";
import { useTwinGpsFix } from "@/hooks/useTwinGpsFix";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";
import { TwinCapturePicker } from "./TwinCapturePicker";
import { TwinCaptureScreen } from "./TwinCaptureScreen";
import { TwinCreditGate } from "./TwinCreditGate";
import { TwinJobStatus } from "./TwinJobStatus";
import { useTwinCreditEstimate } from "@/hooks/useTwinCreditEstimate";

type Props = {
  spaces: HubTwin[];
  projects: HubTwinProject[];
  initialProjectId?: string | null;
  lockProject?: boolean;
  quickMode?: boolean;
};

type QuickBootState = "idle" | "loading" | "error" | "done";

type Step = "picker" | "capture" | "upload";

type Selection = {
  spaceId: string;
  projectId: string;
  spaceTitle: string;
};

export function TwinCaptureFlow({
  spaces,
  projects,
  initialProjectId,
  lockProject = false,
  quickMode = false,
}: Props) {
  const router = useRouter();
  const skipPicker = quickMode && !lockProject;
  const [localSpaces, setLocalSpaces] = useState(spaces);
  const [step, setStep] = useState<Step>(skipPicker ? "capture" : "picker");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [queueBusy, setQueueBusy] = useState(false);
  const [quickBoot, setQuickBoot] = useState<QuickBootState>(skipPicker ? "loading" : "idle");
  const [quickBootError, setQuickBootError] = useState<string | null>(null);

  const {
    files,
    captureId,
    overallProgress,
    isRunning,
    startUpload,
    enqueueJob,
  } = useMultipartTwinUpload();

  const resolveGpsFix = useTwinGpsFix();

  useEffect(() => {
    setLocalSpaces(spaces);
  }, [spaces]);

  useEffect(() => {
    if (!skipPicker || quickBoot !== "loading") return;

    let cancelled = false;

    async function bootQuickScan() {
      const project = projects[0];
      if (!project) {
        if (!cancelled) {
          setQuickBootError("Create an active project before starting a quick scan.");
          setQuickBoot("error");
        }
        return;
      }

      const title = formatQuickScanSpaceTitle();

      try {
        const res = await fetch("/api/digital-twin/spaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, project_id: project.id }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          space?: HubTwin;
          error?: string;
        };

        if (!res.ok || !data.space?.id) {
          throw new Error(data.error ?? "Could not create workspace");
        }

        if (cancelled) return;

        setLocalSpaces((prev) => [data.space!, ...prev.filter((row) => row.id !== data.space!.id)]);
        setSelection({
          spaceId: data.space.id,
          projectId: project.id,
          spaceTitle: title,
        });
        setQuickBoot("done");
        setStep("capture");
      } catch (err) {
        if (!cancelled) {
          setQuickBootError(err instanceof Error ? err.message : "Quick scan setup failed");
          setQuickBoot("error");
        }
      }
    }

    void bootQuickScan();
    return () => {
      cancelled = true;
    };
  }, [projects, quickBoot, skipPicker]);

  const handleExitQuickFlow = useCallback(() => {
    router.push("/digital-twin");
  }, [router]);

  const handleSpaceCreated = useCallback((space: HubTwin) => {
    setLocalSpaces((prev) => [space, ...prev.filter((row) => row.id !== space.id)]);
  }, []);

  const handlePickerStart = useCallback((next: Selection) => {
    setSelection(next);
    setStatusMessage(null);
    setStep("capture");
  }, []);

  const handleCaptureFinish = useCallback(
    async (capturedFiles: File[]) => {
      if (!selection || !capturedFiles.length) {
        setStatusMessage("No capture files — take at least one photo or video.");
        setStep("capture");
        return;
      }

      setStep("upload");
      setStatusMessage(null);

      try {
        const gps = await resolveGpsFix();
        await startUpload(
          {
            spaceId: selection.spaceId,
            projectId: selection.projectId,
            title: selection.spaceTitle,
            gps,
          },
          capturedFiles,
        );
        setStatusMessage("Upload complete. Queue processing when ready.");
      } catch (err) {
        setStatusMessage(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [resolveGpsFix, selection, startUpload],
  );

  const handleEnqueue = useCallback(async () => {
    setQueueBusy(true);
    setStatusMessage(null);
    try {
      const result = await enqueueJob("spz");
      setStatusMessage(`Processing job queued (${result.job.id})`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to queue job");
    } finally {
      setQueueBusy(false);
    }
  }, [enqueueJob]);

  const allComplete = files.length > 0 && files.every((row) => row.status === "complete");
  const { estimate: creditEstimate } = useTwinCreditEstimate(captureId, allComplete);
  const canQueue = allComplete && (creditEstimate?.sufficient ?? false) && !queueBusy;

  if (quickBoot === "loading") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-8">
        <IconLoader2 className={cn("h-8 w-8 animate-spin", twinAccent.spinner)} />
        <p className="text-sm text-zinc-400">Preparing quick scan…</p>
      </div>
    );
  }

  if (quickBoot === "error") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
        <p className="text-sm text-zinc-300">{quickBootError ?? "Quick scan could not start."}</p>
        <Link href="/projects" className={cn("text-sm font-semibold", twinAccent.link)}>
          Go to projects
        </Link>
      </div>
    );
  }

  if (step === "picker") {
    return (
      <TwinCapturePicker
        spaces={localSpaces}
        projects={projects}
        initialProjectId={initialProjectId}
        lockProject={lockProject}
        onStart={handlePickerStart}
        onSpaceCreated={handleSpaceCreated}
      />
    );
  }

  if (step === "capture" && selection) {
    const projectName = projects.find((row) => row.id === selection.projectId)?.name ?? null;
    return (
      <TwinCaptureScreen
        projectName={projectName}
        spaceName={selection.spaceTitle}
        onCancel={skipPicker ? handleExitQuickFlow : () => setStep("picker")}
        onFinish={(result) => void handleCaptureFinish(result.files)}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
        <h2 className="text-sm font-semibold text-zinc-100">Uploading capture</h2>
        <p className="text-xs text-zinc-400">{selection?.spaceTitle}</p>

        {isRunning || files.length > 0 ? (
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

        {isRunning ? (
          <p className="inline-flex items-center gap-2 text-xs text-zinc-400">
            <IconLoader2 className={cn("h-3.5 w-3.5 animate-spin", twinAccent.spinner)} />
            Uploading to cloud storage…
          </p>
        ) : null}

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
            {queueBusy ? "Queuing…" : "Queue processing job"}
          </button>
        ) : null}

        {captureId && selection ? (
          <TwinJobStatus captureId={captureId} spaceId={selection.spaceId} />
        ) : null}

        {captureId ? (
          <p className="text-xs text-zinc-500">
            Capture <span className="font-mono text-zinc-400">{captureId.slice(0, 8)}…</span>
          </p>
        ) : null}

        {statusMessage ? <p className="text-xs text-zinc-300">{statusMessage}</p> : null}

        <button
          type="button"
          onClick={skipPicker ? handleExitQuickFlow : () => setStep("picker")}
          className="text-center text-xs text-zinc-400 hover:text-zinc-200"
        >
          {skipPicker ? "Back to Digital Twin" : "Back to workspace picker"}
        </button>
      </div>
    </div>
  );
}
