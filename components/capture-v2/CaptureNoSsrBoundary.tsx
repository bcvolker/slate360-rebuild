"use client";

import dynamic from "next/dynamic";
import { CaptureProvider } from "@/components/site-walk/capture/CaptureContext";
import { SiteWalkSessionProvider } from "@/components/site-walk/SiteWalkSessionProvider";
import type { CaptureV2Session } from "./session-types";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

type Props = {
  session: CaptureV2Session;
  showPlanCanvas: boolean;
  showStartChoice: boolean;
  autoOpenCamera: boolean;
  launchId: string | null;
  initialItemId: string | null;
  returnFromSummary?: boolean;
  planSets: SiteWalkPlanSet[];
  planSheets: SiteWalkPlanSheet[];
  preferredPlanSetId?: string | null;
  photo360Entitled?: boolean;
};

const CaptureV2Shell = dynamic(
  () => import("./CaptureV2Shell").then((mod) => mod.CaptureV2Shell),
  { ssr: false, loading: () => <CaptureV2ShellLoading /> },
);

export function CaptureNoSsrBoundary(props: Props) {
  return (
    <SiteWalkSessionProvider sessionId={props.session.id}>
      <CaptureProvider>
        <CaptureV2Shell {...props} />
      </CaptureProvider>
    </SiteWalkSessionProvider>
  );
}

function CaptureV2ShellLoading() {
  return (
    <main className="relative flex h-full min-h-0 w-full flex-grow flex-col overflow-hidden bg-[#0B0F15] pb-safe text-white">
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-center text-sm font-bold text-slate-300 shadow-lg shadow-black/40 backdrop-blur-md">
          Loading capture…
        </div>
      </div>
    </main>
  );
}
