"use client";

import { DualModeToggle } from "@/components/site-walk/capture/DualModeToggle";
import { CaptureClientIsland } from "./CaptureClientIsland";
import { SiteWalkSessionProvider } from "./SiteWalkSessionProvider";
import { WalkHeader } from "./WalkHeader";
import type { ActiveWalkSession } from "./session-shell-types";

type Props = {
  session: ActiveWalkSession;
  showPlanCanvas: boolean;
  autoOpenCamera: boolean;
};

export function CaptureShell({ session, showPlanCanvas, autoOpenCamera }: Props) {
  return (
    <SiteWalkSessionProvider initialSession={session}>
      <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-4 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <WalkHeader />
          <DualModeToggle />
          <CaptureClientIsland sessionId={session.id} projectId={session.project_id} showPlanCanvas={showPlanCanvas} autoOpenCamera={autoOpenCamera} />
        </div>
      </main>
    </SiteWalkSessionProvider>
  );
}
