"use client";

import dynamic from "next/dynamic";
import type { ActiveWalkSession } from "./session-shell-types";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

type Props = {
  session: ActiveWalkSession;
  showPlanCanvas: boolean;
  showStartChoice: boolean;
  autoOpenCamera: boolean;
  launchId: string | null;
  initialItemId: string | null;
  planSets: SiteWalkPlanSet[];
  planSheets: SiteWalkPlanSheet[];
};

const CaptureShell = dynamic(
  () => import("./CaptureShell").then((mod) => mod.CaptureShell),
  { ssr: false, loading: () => <CaptureShellLoading /> },
);

export function CaptureNoSsrBoundary(props: Props) {
  return <CaptureShell {...props} />;
}

function CaptureShellLoading() {
  return (
    <main className="min-h-[calc(100vh-160px)] bg-[#0B0F15] px-4 py-4 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-sm font-bold text-slate-300 shadow-lg shadow-black/40 backdrop-blur-md">
        Loading Site Walk capture…
      </div>
    </main>
  );
}
