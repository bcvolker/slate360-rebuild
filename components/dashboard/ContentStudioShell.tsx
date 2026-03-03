"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { Layers, Video, Image, Wand2, ArrowRight } from "lucide-react";

const COMING_FEATURES = [
  { icon: Image, label: "Rendering Engine", desc: "Create photorealistic project renderings from 3D models and site photos." },
  { icon: Video, label: "Video Production", desc: "Assemble walkthrough videos, time-lapses, and marketing reels." },
  { icon: Wand2, label: "AI-Assisted Editing", desc: "Smart cropping, background removal, and batch processing." },
  { icon: Layers, label: "Asset Library", desc: "Manage textures, HDRIs, overlays, and brand templates." },
];

export default function ContentStudioShell() {
  return (
    <DashboardTabShell
      category="Creative Tools"
      title="Content Studio"
      description="Create and manage visual content, renderings, and marketing assets."
      icon={Layers}
      accent="#1E3A8A"
    >
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center">
            <Layers size={20} className="text-[#1E3A8A]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900">Coming Soon</h2>
            <p className="text-sm text-gray-500">Content Studio is currently under development.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          Content Studio will provide tools for creating renderings, walkthrough videos,
          marketing assets, and AI-assisted visual content from your project data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {COMING_FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.label} className="rounded-2xl border border-gray-200 bg-white p-5 flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-[#1E3A8A]/8 flex items-center justify-center">
                <Icon size={18} className="text-[#1E3A8A]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{f.label}</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">File Management</h3>
          <p className="mt-1 text-xs text-gray-500">Content assets are stored and organised through SlateDrop.</p>
        </div>
        <a href="/slatedrop" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-[#1E3A8A]/30 hover:text-[#1E3A8A] transition-colors">
          Open SlateDrop <ArrowRight size={14} />
        </a>
      </div>
    </DashboardTabShell>
  );
}
