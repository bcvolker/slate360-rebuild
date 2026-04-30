"use client";

import dynamic from "next/dynamic";
import type { ActiveWalkSession } from "./session-shell-types";

type Props = {
  session: ActiveWalkSession;
  showPlanCanvas: boolean;
  showStartChoice: boolean;
  autoOpenCamera: boolean;
  launchId: string | null;
  initialItemId: string | null;
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
    <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-4 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-300 bg-white p-6 text-sm font-bold text-slate-600 shadow-sm">
        Loading Site Walk capture…
      </div>
    </main>
  );
}
