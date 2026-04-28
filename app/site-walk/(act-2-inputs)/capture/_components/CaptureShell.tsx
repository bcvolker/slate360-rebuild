"use client";

import { CaptureClientIsland } from "./CaptureClientIsland";
import { SiteWalkSessionProvider } from "./SiteWalkSessionProvider";
import type { ActiveWalkSession } from "./session-shell-types";

type Props = {
  session: ActiveWalkSession;
  showPlanCanvas: boolean;
  autoOpenCamera: boolean;
  launchId: string | null;
};

export function CaptureShell({ session, showPlanCanvas, autoOpenCamera, launchId }: Props) {
  return (
    <SiteWalkSessionProvider initialSession={session}>
      <main className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-950">
        <CaptureClientIsland sessionId={session.id} projectId={session.project_id} showPlanCanvas={showPlanCanvas} autoOpenCamera={autoOpenCamera} launchId={launchId} />
      </main>
    </SiteWalkSessionProvider>
  );
}
