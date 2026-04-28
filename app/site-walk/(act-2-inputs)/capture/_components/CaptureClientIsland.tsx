"use client";

import dynamic from "next/dynamic";
import { CaptureBottomSheet } from "@/components/site-walk/capture/CaptureBottomSheet";
import { SyncQueueIndicator } from "@/components/site-walk/capture/SyncQueueIndicator";

type Props = {
  sessionId: string;
  projectId: string | null;
  showPlanCanvas: boolean;
  autoOpenCamera: boolean;
  launchId: string | null;
};

const CameraViewfinder = dynamic<{ sessionId: string; autoOpenCamera?: boolean; launchId?: string | null }>(
  () => import("@/components/site-walk/capture/CameraViewfinder").then((mod) => mod.CameraViewfinder),
  { ssr: false, loading: () => <IslandLoading label="Loading capture tools…" /> },
);

const PlanViewer = dynamic<{ sessionId: string; projectId: string | null }>(
  () => import("@/components/site-walk/capture/PlanViewer").then((mod) => mod.PlanViewer),
  { ssr: false, loading: () => <IslandLoading label="Loading plan canvas…" /> },
);

const UnifiedVectorToolbar = dynamic(
  () => import("@/components/site-walk/capture/UnifiedVectorToolbar").then((mod) => mod.UnifiedVectorToolbar),
  { ssr: false, loading: () => <IslandLoading label="Loading markup tools…" compact /> },
);

export function CaptureClientIsland({ sessionId, projectId, showPlanCanvas, autoOpenCamera, launchId }: Props) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
        <CameraViewfinder sessionId={sessionId} autoOpenCamera={autoOpenCamera} launchId={launchId} />
        {showPlanCanvas && <PlanViewer sessionId={sessionId} projectId={projectId} />}
      </div>
      <aside className="space-y-4">
        <SyncQueueIndicator />
        <UnifiedVectorToolbar />
        <CaptureBottomSheet sessionId={sessionId} projectId={projectId} />
      </aside>
    </section>
  );
}

function IslandLoading({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`rounded-3xl border border-slate-300 bg-white p-4 text-sm font-bold text-slate-600 shadow-sm ${compact ? "min-h-20" : "min-h-48"}`}>
      {label}
    </div>
  );
}
