import { Camera, ImagePlus, Mic } from "lucide-react";

export function CameraViewfinder() {
  return (
    <section className="min-h-[420px] rounded-3xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 p-6 text-center">
        <Camera className="h-10 w-10 text-blue-800" />
        <h2 className="mt-4 text-xl font-black text-slate-950">Camera viewfinder scaffold</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          Prompt 6 wires browser camera, uploads, capture metadata, SlateDrop reservation, and draft recovery here.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-bold text-slate-700">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1"><Camera className="h-3 w-3" /> Camera</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1"><ImagePlus className="h-3 w-3" /> Upload</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1"><Mic className="h-3 w-3" /> Voice</span>
        </div>
      </div>
    </section>
  );
}
