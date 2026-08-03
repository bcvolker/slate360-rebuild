"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { IconLoader2 } from "@tabler/icons-react";
import { isNativeTwinCaptureAvailable } from "@/src/plugins/LiDARCapture";
import { TwinNativeCaptureLauncher } from "./TwinNativeCaptureLauncher";
import { TwinCaptureScreen, type TwinCaptureFinishResult } from "./TwinCaptureScreen";
import { formatQuickScanSpaceTitle } from "@/lib/digital-twin/quick-scan-title";
import { setTwinCapturePendingSession } from "@/lib/digital-twin/twin-capture-pending-session";
import { persistTwinCaptureReviewState } from "@/lib/digital-twin/twin-capture-pending-persist";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";

type Props = {
  spaces: HubTwin[];
  projects: HubTwinProject[];
  initialProjectId?: string | null;
  lockProject?: boolean;
  quickMode?: boolean;
};

type Selection = {
  spaceId: string;
  projectId: string;
  spaceTitle: string;
};

type QuickBootState = "loading" | "error" | "done";

export function TwinCaptureFlow({
  spaces,
  projects,
  initialProjectId,
  lockProject = false,
  quickMode = false,
}: Props) {
  const router = useRouter();
  const quickStart = quickMode && !lockProject;
  const defaultSelection = useMemo(() => resolveSelection(spaces, initialProjectId), [initialProjectId, spaces]);
  const [selection, setSelection] = useState<Selection | null>(quickStart ? null : defaultSelection);
  const [quickBoot, setQuickBoot] = useState<QuickBootState>(quickStart ? "loading" : defaultSelection ? "done" : "error");
  const [quickBootError, setQuickBootError] = useState<string | null>(
    !quickStart && !defaultSelection ? "No capture destination is available." : null,
  );
  const [debugCapture, setDebugCapture] = useState(false);
  const [nativeLidar, setNativeLidar] = useState<boolean | null>(
    Capacitor.getPlatform() === "ios" ? null : false,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugCapture(params.get("debug") === "1");
  }, []);

  useEffect(() => {
    if (!quickStart || quickBoot !== "loading") return;
    let cancelled = false;
    async function bootQuickScan() {
      const title = formatQuickScanSpaceTitle();
      try {
        const response = await fetch("/api/digital-twin/spaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, quick_scan: true }),
        });
        const data = (await response.json().catch(() => ({}))) as { space?: HubTwin; error?: string };
        if (!response.ok || !data.space?.id) throw new Error(data.error ?? "Could not prepare capture");
        if (cancelled) return;
        setSelection({
          spaceId: data.space.id,
          projectId: data.space.projectId ?? "",
          spaceTitle: title,
        });
        setQuickBoot("done");
      } catch (error) {
        if (!cancelled) {
          setQuickBootError(error instanceof Error ? error.message : "Could not prepare capture");
          setQuickBoot("error");
        }
      }
    }
    void bootQuickScan();
    return () => {
      cancelled = true;
    };
  }, [quickBoot, quickStart]);

  useEffect(() => {
    if (nativeLidar !== null) return;
    let cancelled = false;
    void isNativeTwinCaptureAvailable().then((available) => {
      if (!cancelled) setNativeLidar(available);
    });
    return () => {
      cancelled = true;
    };
  }, [nativeLidar]);

  const handleCancel = useCallback(() => {
    router.push("/digital-twin");
  }, [router]);

  const handleCaptureFinish = useCallback(
    async (result: TwinCaptureFinishResult) => {
      if (!selection || !result.files.length) return;
      const projectName = projects.find((project) => project.id === selection.projectId)?.name ?? null;
      const pendingSession = {
        selection,
        projectName,
        quickMode: quickStart,
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
      } catch (error) {
        console.error("[twin-capture] review persist failed", error);
      }
      router.push("/digital-twin/capture/review");
    },
    [projects, quickStart, router, selection],
  );

  const handleNativeUploaded = useCallback(
    ({ captureId }: { captureId: string }) => {
      router.push(`/digital-twin/capture/submit?captureId=${encodeURIComponent(captureId)}`);
    },
    [router],
  );

  if (quickBoot === "loading" || nativeLidar === null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-8">
        <IconLoader2 className="h-8 w-8 animate-spin text-[var(--twin360-blue)]" aria-hidden="true" />
        <p className="text-sm text-[var(--graphite-muted)]">Preparing capture…</p>
      </div>
    );
  }

  if (quickBoot === "error" || !selection) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <p className="text-sm text-[var(--graphite-muted)]">{quickBootError ?? "Could not prepare capture."}</p>
        <button
          type="button"
          onClick={handleCancel}
          className="min-h-12 rounded-xl border border-white/10 px-5 text-sm font-semibold text-[var(--graphite-text-body)]"
        >
          Back
        </button>
      </div>
    );
  }

  const projectName = projects.find((project) => project.id === selection.projectId)?.name ?? null;
  if (nativeLidar) {
    return (
      <TwinNativeCaptureLauncher
        spaceId={selection.spaceId}
        projectId={selection.projectId}
        title={selection.spaceTitle}
        onUploaded={handleNativeUploaded}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <TwinCaptureScreen
      projectName={projectName}
      spaceName={selection.spaceTitle}
      onCancel={handleCancel}
      onFinish={handleCaptureFinish}
      debug={debugCapture}
    />
  );
}

function resolveSelection(spaces: HubTwin[], projectId?: string | null): Selection | null {
  const space = projectId
    ? spaces.find((candidate) => candidate.projectId === projectId)
    : spaces[0];
  if (!space?.id || !space.projectId) return null;
  return {
    spaceId: space.id,
    projectId: space.projectId,
    spaceTitle: space.title,
  };
}
