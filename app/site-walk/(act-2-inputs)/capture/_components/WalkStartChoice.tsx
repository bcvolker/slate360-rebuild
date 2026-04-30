"use client";

import { Camera, Map, ArrowRight } from "lucide-react";

type Props = {
  walkName: string;
  onPlanMode: () => void;
  onCameraOnly: () => void;
};

export function WalkStartChoice({ walkName, onPlanMode, onCameraOnly }: Props) {
  return (
    <section className="flex h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),rgba(2,6,23,0.98)_52%)] p-4 text-white">
      <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-2xl sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100">Start Site Walk</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">Walk with Plans or Camera Only?</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/65">{walkName} has plan sheets available. Choose the field workflow for this pass. You can switch modes from the header after starting.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ChoiceCard title="Walk with Plans" text="Open the Master Plan Room first, use sheet navigation, and capture from plan context." icon="plan" onClick={onPlanMode} />
          <ChoiceCard title="Camera Only" text="Skip plans for this pass and go straight to the visual capture workflow." icon="camera" onClick={onCameraOnly} />
        </div>
      </div>
    </section>
  );
}

function ChoiceCard({ title, text, icon, onClick }: { title: string; text: string; icon: "plan" | "camera"; onClick: () => void }) {
  const Icon = icon === "plan" ? Map : Camera;
  return (
    <button type="button" onClick={onClick} className="group min-h-52 rounded-[1.5rem] border border-white/15 bg-slate-950/60 p-4 text-left shadow-xl transition hover:border-cyan-200/60 hover:bg-cyan-300/10">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/25 bg-cyan-300/15 text-cyan-100"><Icon className="h-6 w-6" /></span>
      <span className="mt-4 block text-xl font-black text-white">{title}</span>
      <span className="mt-2 block text-sm font-semibold leading-6 text-white/60">{text}</span>
      <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-100">Continue <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
    </button>
  );
}
