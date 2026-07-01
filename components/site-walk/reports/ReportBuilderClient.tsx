"use client";

import { Save, FileText, Image as ImageIcon, FileOutput, CloudSun, Map, GripVertical } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";

const BLOCKS = [
  { id: "photos",  icon: ImageIcon, label: "Walk Photos", desc: "Drag to add selected photos" },
  { id: "notes",   icon: FileText,  label: "Trade Notes", desc: "Include field observations" },
  { id: "plan",    icon: Map,       label: "Plan Snippet", desc: "Embed plan with pins" },
  { id: "weather", icon: CloudSun,  label: "Weather Audit", desc: "Add daily weather conditions" },
];

export function ReportBuilderClient() {
  return (
    <div className="flex h-[calc(100vh-160px)] min-h-[500px] gap-4">
      {/* Left Pane: The Data Drawer */}
      <GlassCard className="w-[30%] min-w-[280px] p-4 flex flex-col h-full">
        <div className="mb-4 shrink-0">
          <h2 className="text-lg font-black text-white">Data Drawer</h2>
          <p className="text-xs text-slate-400">Drag blocks into the report canvas</p>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1">
          {BLOCKS.map((block) => (
            <div
              key={block.id}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/20 p-3 hover:bg-black/40 hover:border-white/10 transition-colors cursor-grab active:cursor-grabbing group"
            >
              <GripVertical className="mt-1 h-4 w-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
              <div className="mt-0.5 shrink-0 rounded-lg bg-slate-800/50 p-2 text-slate-300">
                <block.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">{block.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{block.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Right Pane: The Report Canvas */}
      <div className="flex-1 flex flex-col relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl">
        <div className="flex-1 overflow-y-auto no-scrollbar relative w-full h-full p-8 flex justify-center">
          
          {/* Document Wireframe */}
          <div className="w-full max-w-[800px] bg-slate-50 relative flex flex-col shadow-lg border border-slate-300 min-h-[1050px]">
            {/* Document Header (Org Branding) */}
            <div className="border-b border-slate-200 p-8 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-slate-200 flex items-center justify-center border border-slate-300 border-dashed">
                  <span className="text-[10px] font-bold text-slate-400 text-center leading-tight">LOGO<br/>HERE</span>
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900 uppercase tracking-wide">Organization Name</h1>
                  <p className="text-xs text-slate-500 font-medium">Field Inspection Report</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--graphite-primary)]">REPORT</p>
                <p className="text-sm font-black text-slate-700 mt-0.5">YYYY-MM-DD</p>
              </div>
            </div>

            {/* Document Body Drop-Zone */}
            <div className="flex-1 p-8 bg-slate-50/50 flex flex-col">
              <div className="flex-1 rounded-xl border-2 border-dashed border-sky-500/30 bg-sky-500/5 flex flex-col items-center justify-center p-8 text-center transition-colors hover:bg-sky-500/10">
                <FileOutput className="h-8 w-8 text-sky-500/50 mb-3" />
                <p className="text-sm font-black text-slate-600">Report Canvas</p>
                <p className="mt-1 text-xs text-slate-500 max-w-[200px]">Drag and drop data blocks here to build the document</p>
              </div>
            </div>
          </div>
          
        </div>

        {/* Footer: Sticky Action Bar */}
        <GlassCard className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 flex items-center gap-4 border-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)] bg-slate-950/90 shadow-xl backdrop-blur-xl">
          <p className="text-xs font-bold text-slate-400">1 Page • 0 Blocks</p>
          <button className="flex items-center gap-2 rounded-xl bg-[var(--graphite-primary)] px-5 py-2.5 text-sm font-black text-[var(--graphite-canvas)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_85%,white)] transition-colors shadow-[0_0_15px_color-mix(in_srgb,var(--graphite-primary)_20%,transparent)]">
            <Save className="h-4 w-4" />
            Generate PDF & Save to SlateDrop
          </button>
        </GlassCard>
      </div>
    </div>
  );
}
