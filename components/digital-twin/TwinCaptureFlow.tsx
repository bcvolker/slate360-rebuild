"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { IconLoader2 } from "@tabler/icons-react";
import { probeNativeTwinCapture, type NativeCaptureProbe } from "@/src/plugins/LiDARCapture";
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
  const [probe, setProbe] = useState<NativeCaptureProbe | null>(null);
  // Explicit opt-in to the no-LiDAR web recorder. Previously the app dropped to
  // it silently, so a "LiDAR scan" could return a lone .mp4 with no point cloud.
  const [acceptedNoLidar, setAcceptedNoLidar] = useState(false);

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
    void probeNativeTwinCapture().then((result) => {
      if (cancelled) return;
      setProbe(result);
      setNativeLidar(result.nativeCapture);
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

  // No silent downgrade: if native LiDAR capture is unavailable, say so, show which
  // build is installed, and make continuing without LiDAR a deliberate choice.
  if (!acceptedNoLidar) {
    return (
      <NoLidarNotice probe={probe} onContinue={() => setAcceptedNoLidar(true)} onCancel={handleCancel} />
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

const REASON_COPY: Record<NativeCaptureProbe["reason"], { title: string; body: string }> = {
  ok: { title: "", body: "" },
  not_native_app: {
    title: "Not running in the Slate360 app",
    body: "LiDAR capture needs the installed iOS app. This looks like a browser tab or a different app — open Slate360 from your home screen and try again.",
  },
  no_lidar_device: {
    title: "This device has no LiDAR",
    body: "Scanning depth needs an iPhone Pro / Pro Max (12 Pro or newer). Video will still record, but no point cloud or measurements can be produced.",
  },
  old_build: {
    title: "Installed build is too old for LiDAR capture",
    body: "Update to the latest TestFlight build, then reopen this screen.",
  },
};

function NoLidarNotice({
  probe,
  onContinue,
  onCancel,
}: {
  probe: NativeCaptureProbe | null;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const copy = REASON_COPY[probe?.reason ?? "not_native_app"];
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
      <p className="text-base font-semibold text-[var(--graphite-text-header)]">{copy.title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-[var(--graphite-muted)]">{copy.body}</p>
      <p className="max-w-sm text-xs leading-relaxed text-[var(--graphite-muted)]">
        Continuing records <strong>video only</strong> — no depth, no scale, and no measurements.
      </p>
      <div className="flex flex-col items-stretch gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-xl bg-[var(--twin360-blue)] px-5 text-sm font-bold text-[var(--graphite-canvas)]"
        >
          Go back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="min-h-12 rounded-xl border border-white/10 px-5 text-sm font-semibold text-[var(--graphite-text-body)]"
        >
          Record video without LiDAR
        </button>
      </div>
      <p className="pt-2 font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
        build {probe?.buildNumber ?? "?"} · {probe?.buildCommit ?? "unknown"}
      </p>
    </div>
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
