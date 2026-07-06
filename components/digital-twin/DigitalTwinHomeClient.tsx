"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Scan, Plus } from "lucide-react";
import { useMobileShellDock } from "@/components/mobile-system";
import { appHomeTokens } from "@/components/studio-ui/app-home-tokens";
import { DigitalTwinProjectTargetSheet } from "@/components/digital-twin/DigitalTwinProjectTargetSheet";
import { TwinHomeCaptureSheet } from "@/components/digital-twin/home/TwinHomeCaptureSheet";
import { TwinHomeFeed } from "@/components/digital-twin/home/TwinHomeFeed";
import {
  buildTwinCaptureLaunchUrl,
  buildTwinUploadLaunchUrl,
} from "@/lib/digital-twin/twin-capture-launch";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";

type Props = {
  orgName: string | null;
  twins: HubTwin[];
  projects: HubTwinProject[];
};

/**
 * Slice 2 — the Twin 360 mobile home, rebuilt from the ground up.
 *
 * Old home (deleted): two competing hero cards + a 2×2 quick-action grid
 * (My Twins / Upload / Processing / Projects — all redundant with the feed or
 * the bottom nav) + a dock of recent-twin/project tabs. That grid was the
 * "valueless" part; Processing duplicated a filter, Projects duplicated the
 * bottom-nav tab.
 *
 * New home: ONE prominent, persistent "New Scan" control over the live twins
 * feed. Capture is one tap (with the quick / into-a-project / upload branch in a
 * sheet); the feed is the body, each twin showing an honest live status chip.
 * Nothing that worked is lost — capture, upload, project-scoped capture, and the
 * twins list all route through here.
 */
export function DigitalTwinHomeClient({ twins, projects }: Props) {
  const router = useRouter();
  const [captureSheetOpen, setCaptureSheetOpen] = useState(false);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);

  // The feed is the home body — no bottom dock.
  useMobileShellDock(null);

  const openCapture = useCallback(() => setCaptureSheetOpen(true), []);

  const handleQuickScan = useCallback(() => {
    router.push(buildTwinCaptureLaunchUrl({ mode: "quick" }));
  }, [router]);

  const handleScanIntoProject = useCallback(() => {
    // Cross-app continuity: a project-scoped scan lands in the project's
    // SlateDrop folders alongside its plans, files, and walks. No projects yet
    // → send them to create one first.
    if (projects.length === 0) {
      router.push("/projects");
      return;
    }
    setProjectSheetOpen(true);
  }, [projects.length, router]);

  const handleUpload = useCallback(() => {
    router.push(buildTwinUploadLaunchUrl({ mode: "quick" }));
  }, [router]);

  const handleProjectSelected = useCallback(
    (project: HubTwinProject) => {
      router.push(buildTwinCaptureLaunchUrl({ projectId: project.id, mode: "project" }));
    },
    [router],
  );

  return (
    <div className={appHomeTokens.scrollInner}>
      {/* Sticky, prominent primary action — always one tap from capture. */}
      <button
        type="button"
        onClick={openCapture}
        aria-label="Start a new scan"
        data-twin-home="new-scan"
        className="sticky top-0 z-10 flex w-full items-center gap-3.5 rounded-2xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,var(--graphite-canvas))] p-4 backdrop-blur-md transition active:scale-[0.99]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_16%,transparent)] text-[var(--twin360-blue)]">
          <Scan className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-base font-bold text-zinc-100">New Scan</span>
          <span className="mt-0.5 block text-xs text-[var(--graphite-muted)]">
            Turn a space into an interactive 3D twin
          </span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--twin360-blue)] text-[var(--graphite-canvas)]">
          <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </span>
      </button>

      <TwinHomeFeed twins={twins} onStartScan={openCapture} />

      <TwinHomeCaptureSheet
        open={captureSheetOpen}
        onOpenChange={setCaptureSheetOpen}
        onQuickScan={handleQuickScan}
        onScanIntoProject={handleScanIntoProject}
        onUpload={handleUpload}
        projectCount={projects.length}
      />

      <DigitalTwinProjectTargetSheet
        open={projectSheetOpen}
        onOpenChange={setProjectSheetOpen}
        projects={projects}
        onSelect={handleProjectSelected}
      />
    </div>
  );
}
