"use client";

import { CaptureClientIsland } from "./CaptureClientIsland";
import { SiteWalkSessionProvider } from "./SiteWalkSessionProvider";
import type { ActiveWalkSession } from "./session-shell-types";

type Props = {
  session: ActiveWalkSession;
  showPlanCanvas: boolean;
  showStartChoice: boolean;
  autoOpenCamera: boolean;
  launchId: string | null;
  initialItemId: string | null;
};

export function CaptureShell({ session, showPlanCanvas, showStartChoice, autoOpenCamera, launchId, initialItemId }: Props) {
  return (
    <SiteWalkSessionProvider initialSession={session}>
      <main className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-950">
        <CaptureClientIsland sessionId={session.id} projectId={session.project_id} walkName={session.title || session.project_name || "Current walk"} showPlanCanvas={showPlanCanvas} showStartChoice={showStartChoice} autoOpenCamera={autoOpenCamera} launchId={launchId} initialItemId={initialItemId} />
      </main>
    </SiteWalkSessionProvider>
  );
}
