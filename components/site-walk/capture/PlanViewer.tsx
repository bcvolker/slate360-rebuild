import { Crosshair, MapPinned } from "lucide-react";

export function PlanViewer() {
  return (
    <section className="min-h-[420px] rounded-3xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="relative flex h-full min-h-[380px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-300 bg-[linear-gradient(90deg,#e2e8f0_1px,transparent_1px),linear-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] p-6 text-center">
        <MapPinned className="h-10 w-10 text-blue-800" />
        <h2 className="mt-4 text-xl font-black text-slate-950">Plan viewer scaffold</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          Prompt 7 wires plan sheets, zoom/pan, long-press pin drops, and realtime ghost-pin movement here.
        </p>
        <div className="absolute right-4 top-4 rounded-full border border-blue-200 bg-blue-50 p-2 text-blue-800">
          <Crosshair className="h-4 w-4" />
        </div>
      </div>
    </section>
  );
}
