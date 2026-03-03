"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { Film, MonitorPlay, Box, Headphones, ArrowRight } from "lucide-react";

const COMING_FEATURES = [
  { icon: MonitorPlay, label: "Virtual Production", desc: "Real-time 3D environments for site visualisation and client presentations." },
  { icon: Box, label: "Scene Composition", desc: "Place models, lighting, and cameras to create virtual site scenes." },
  { icon: Headphones, label: "VR Walkthrough", desc: "Immersive VR experiences for remote stakeholder reviews." },
  { icon: Film, label: "Cinematic Rendering", desc: "High-quality rendered video output for marketing and documentation." },
];

export default function VirtualStudioShell() {
  return (
    <DashboardTabShell
      category="Creative Tools"
      title="Virtual Studio"
      description="Virtual production, site visualization, and simulation environments."
      icon={Film}
      accent="#FF4D00"
    >
      <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-white p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-[#FF4D00]/10 flex items-center justify-center">
            <Film size={20} className="text-[#FF4D00]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900">Coming Soon</h2>
            <p className="text-sm text-gray-500">Virtual Studio is currently under development.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          Virtual Studio will provide tools for virtual production, immersive VR walkthroughs,
          scene composition, and cinematic rendering of construction sites and architectural projects.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {COMING_FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.label} className="rounded-2xl border border-gray-200 bg-white p-5 flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-[#FF4D00]/8 flex items-center justify-center">
                <Icon size={18} className="text-[#FF4D00]" />
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
          <p className="mt-1 text-xs text-gray-500">Scene files and renders are stored through SlateDrop.</p>
        </div>
        <a href="/slatedrop" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-[#FF4D00]/30 hover:text-[#FF4D00] transition-colors">
          Open SlateDrop <ArrowRight size={14} />
        </a>
      </div>
    </DashboardTabShell>
  );
}
