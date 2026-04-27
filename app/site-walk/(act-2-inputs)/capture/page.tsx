import { CameraViewfinder } from "@/components/site-walk/capture/CameraViewfinder";
import { CaptureBottomSheet } from "@/components/site-walk/capture/CaptureBottomSheet";
import { DualModeToggle } from "@/components/site-walk/capture/DualModeToggle";
import { PlanViewer } from "@/components/site-walk/capture/PlanViewer";
import { SyncQueueIndicator } from "@/components/site-walk/capture/SyncQueueIndicator";
import { UnifiedVectorToolbar } from "@/components/site-walk/capture/UnifiedVectorToolbar";

export default function SiteWalkCapturePage() {
  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-4 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <section className="flex flex-col gap-3 rounded-3xl border border-slate-300 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Act 2 capture</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Field capture shell</h1>
            <p className="mt-1 text-sm text-slate-600">
              Prompt 1 scaffold only. Prompts 5–9 wire sessions, uploads, canvas, classification, realtime, and offline sync.
            </p>
          </div>
          <SyncQueueIndicator />
        </section>

        <DualModeToggle />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
            <CameraViewfinder />
            <PlanViewer />
          </div>
          <aside className="space-y-4">
            <UnifiedVectorToolbar />
            <CaptureBottomSheet />
          </aside>
        </section>
      </div>
    </main>
  );
}
