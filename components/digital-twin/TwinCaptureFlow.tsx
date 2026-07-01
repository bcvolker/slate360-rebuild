"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { IconLoader2 } from "@tabler/icons-react";
import { isNativeTwinCaptureAvailable } from "@/src/plugins/LiDARCapture";
import { TwinNativeCaptureLauncher } from "./TwinNativeCaptureLauncher";
import { formatQuickScanSpaceTitle } from "@/lib/digital-twin/quick-scan-title";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
import { useMultipartTwinUpload } from "@/hooks/useMultipartTwinUpload";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";
import { TwinCapturePicker } from "./TwinCapturePicker";
import { setTwinCapturePendingSession } from "@/lib/digital-twin/twin-capture-pending-session";
import { persistTwinCaptureReviewState } from "@/lib/digital-twin/twin-capture-pending-persist";
import { TwinCaptureScreen, type TwinCaptureFinishResult } from "./TwinCaptureScreen";
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
  const [debugCapture, setDebugCapture] = useState(false);
  const skipPicker = quickMode && !lockProject;
  const [localSpaces, setLocalSpaces] = useState(spaces);
  const [step, setStep] = useState<Step>(skipPicker ? "capture" : "picker");
  const [selection, setSelection] = useState<Selection | null>(null);
  // Set when the native iOS path has already uploaded the capture (files never touch the
  // web layer). The upload-complete view keys off this captureId instead of the web hook.
  const [nativeCaptureId, setNativeCaptureId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [queueBusy, setQueueBusy] = useState(false);
  const [quickBoot, setQuickBoot] = useState<QuickBootState>(skipPicker ? "loading" : "idle");
  const [quickBootError, setQuickBootError] = useState<string | null>(null);
  // Native-led LiDAR capture: null = resolving (iOS only), false = use web getUserMedia path.
  const [nativeLidar, setNativeLidar] = useState<boolean | null>(
    Capacitor.getPlatform() === "ios" ? null : false,
  );

  const {
    files,
    captureId,
    overallProgress,
    isRunning,
    startUpload,
    enqueueJob,
  } = useMultipartTwinUpload();


  useEffect(() => {
    setLocalSpaces(spaces);
  }, [spaces]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugCapture(params.get("debug") === "1");
  }, []);

  // Resolve LiDAR availability once on iOS. Non-LiDAR iPhones fall back to the web path.
  useEffect(() => {
    if (nativeLidar !== null) return;
    let cancelled = false;
    void isNativeTwinCaptureAvailable().then((avail) => {
      if (!cancelled) setNativeLidar(avail);
    });
    return () => {
      cancelled = true;
    };
  }, [nativeLidar]);

  useEffect(() => {
    if (!skipPicker || quickBoot !== "loading") return;

    let cancelled = false;

    async function bootQuickScan() {
      const title = formatQuickScanSpaceTitle();

      try {
        // Quick scans are intentionally unattached — the user can link the
        // twin to a project later from review / My Twins.
        const res = await fetch("/api/digital-twin/spaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, quick_scan: true }),
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
          projectId: data.space.projectId ?? "",
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
    async (result: TwinCaptureFinishResult) => {
      if (!selection || !result.files.length) {
        setStatusMessage("No capture files — take at least one photo or video.");
        setStep("capture");
        return;
      }

      const projectName = projects.find((row) => row.id === selection.projectId)?.name ?? null;
      const pendingSession = {
        selection: {
          spaceId: selection.spaceId,
          projectId: selection.projectId,
          spaceTitle: selection.spaceTitle,
        },
        projectName,
        quickMode: skipPicker,
        clips: result.clips.map((clip) => ({
          id: clip.id,
          index: clip.index,
          mode: clip.mode,
          durationSeconds: clip.durationSeconds,
          frameCount: clip.frameCount,
          files: clip.files,
          thumbnailUrl: clip.thumbnailUrl,
        })),
        lidarFiles: result.lidarFiles?.length ? result.lidarFiles : undefined,
      };
      setTwinCapturePendingSession(pendingSession);
      try {
        await persistTwinCaptureReviewState({
          session: pendingSession,
          scanName: selection.spaceTitle,
          quality: "standard",
          addedSources: [],
        });
      } catch (err) {
        // Persist is a resilience layer; the in-memory session still carries
        // the clips, so continue to review rather than stranding the user.
        console.error("[twin-capture] review persist failed", err);
      }
      router.push("/digital-twin/capture/review");
    },
    [projects, router, selection, skipPicker],
  );

  // Native iOS capture uploads inside the plugin and hands back only a captureId.
  const handleNativeUploaded = useCallback(({ captureId }: { captureId: string }) => {
    setNativeCaptureId(captureId);
    setStatusMessage(null);
    setStep("upload");
  }, []);

  // The effective capture is whichever path produced it: native upload or web hook.
  const effectiveCaptureId = nativeCaptureId ?? captureId;

  const handleEnqueue = useCallback(async () => {
    setQueueBusy(true);
    setStatusMessage(null);
    try {
      const result = await enqueueJob("spz", "standard", effectiveCaptureId ?? undefined);
      setStatusMessage(`Processing job queued (${result.job.id})`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to queue job");
    } finally {
      setQueueBusy(false);
    }
  }, [enqueueJob, effectiveCaptureId]);

  // Native uploads are already finished by the time we reach the upload step.
  const webComplete = files.length > 0 && files.every((row) => row.status === "complete");
  const allComplete = nativeCaptureId != null || webComplete;
  const { estimate: creditEstimate } = useTwinCreditEstimate(effectiveCaptureId, allComplete);
  const canQueue = allComplete && (creditEstimate?.sufficient ?? false) && !queueBusy;

  if (quickBoot === "loading") {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-8"
        data-twin-capture-boot="loading"
      >
        <IconLoader2 className={cn("h-8 w-8 animate-spin", twinAccent.spinner)} />
        <p className="text-sm font-medium text-zinc-300">Preparing quick scan…</p>
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
    const handleCaptureCancel = skipPicker ? handleExitQuickFlow : () => setStep("picker");

    // Still resolving LiDAR availability on iOS — avoid flashing the web camera.
    if (nativeLidar === null) {
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-8">
          <IconLoader2 className={cn("h-8 w-8 animate-spin", twinAccent.spinner)} />
        </div>
      );
    }

    // iOS + LiDAR → native-led ARKit capture (owns the camera, records video + depth + poses,
    // and uploads them directly to storage — files never enter the web layer).
    if (nativeLidar) {
      return (
        <TwinNativeCaptureLauncher
          spaceId={selection.spaceId}
          projectId={selection.projectId}
          title={selection.spaceTitle}
          onUploaded={handleNativeUploaded}
          onCancel={handleCaptureCancel}
        />
      );
    }

    // Web / non-LiDAR devices → existing getUserMedia capture.
    return (
      <TwinCaptureScreen
        projectName={projectName}
        spaceName={selection.spaceTitle}
        onCancel={handleCaptureCancel}
        onFinish={handleCaptureFinish}
        debug={debugCapture}
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

        {allComplete && effectiveCaptureId ? (
          <TwinCreditGate captureId={effectiveCaptureId} enabled={allComplete} />
        ) : null}

        {allComplete && effectiveCaptureId ? (
          <button
            type="button"
            onClick={() => void handleEnqueue()}
            disabled={!canQueue}
            className={cn(twinAccent.button, "w-full min-h-[44px]")}
          >
            {queueBusy ? "Queuing…" : "Queue processing job"}
          </button>
        ) : null}

        {effectiveCaptureId && selection ? (
          <TwinJobStatus captureId={effectiveCaptureId} spaceId={selection.spaceId} />
        ) : null}

        {effectiveCaptureId ? (
          <p className="text-xs text-zinc-500">
            Capture <span className="font-mono text-zinc-400">{effectiveCaptureId.slice(0, 8)}…</span>
          </p>
        ) : null}

        {statusMessage ? <p className="text-xs text-zinc-300">{statusMessage}</p> : null}

        <button
          type="button"
          onClick={skipPicker ? handleExitQuickFlow : () => setStep("picker")}
          className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-[var(--twin360-blue)]/40 bg-[var(--twin360-blue)]/10 px-4 text-sm font-semibold text-[var(--twin360-blue)] transition-colors hover:bg-[var(--twin360-blue)]/20"
        >
          <span aria-hidden className="text-base leading-none">‹</span>
          {skipPicker ? "Back to Digital Twin" : "Back to workspace picker"}
        </button>
      </div>
    </div>
  );
}
