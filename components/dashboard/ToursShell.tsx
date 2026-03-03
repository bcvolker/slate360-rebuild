"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { Compass, MapPin, Camera, Eye, ArrowRight } from "lucide-react";

const COMING_FEATURES = [
  { icon: Camera, label: "360° Capture", desc: "Upload panoramic photos or stitch standard images into immersive 360° views." },
  { icon: MapPin, label: "Floor Plan Mapping", desc: "Pin 360 hotspots onto floor plans for spatial navigation." },
  { icon: Eye, label: "Virtual Walkthroughs", desc: "Build interactive tour paths with hotspot-to-hotspot navigation." },
  { icon: Compass, label: "Progress Comparison", desc: "Side-by-side or slider time-lapse comparison across capture dates." },
];

export default function ToursShell() {
  return (
    <DashboardTabShell
      category="Creative Tools"
      title="360 Tours"
      description="Immersive 360° virtual tours for client presentations and remote inspections."
      icon={Compass}
      accent="#FF4D00"
    >
      <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-white p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-[#FF4D00]/10 flex items-center justify-center">
            <Compass size={20} className="text-[#FF4D00]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900">Coming Soon</h2>
            <p className="text-sm text-gray-500">360 Tour Builder is currently under development.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          Build immersive 360° tours from panoramic captures, pin hotspots to floor plans,
          and share interactive walkthroughs with clients and stakeholders.
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
          <p className="mt-1 text-xs text-gray-500">360° captures are stored and versioned through SlateDrop.</p>
        </div>
        <a href="/slatedrop" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-[#FF4D00]/30 hover:text-[#FF4D00] transition-colors">
          Open SlateDrop <ArrowRight size={14} />
        </a>
      </div>
    </DashboardTabShell>
  );
}
