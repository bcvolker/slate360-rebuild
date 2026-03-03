"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { Globe, Plane, MapPin, BarChart3, ArrowRight } from "lucide-react";

const COMING_FEATURES = [
  { icon: Plane, label: "Drone Flight Planning", desc: "Plan automated drone survey flights with waypoint management and coverage maps." },
  { icon: MapPin, label: "Point Cloud Processing", desc: "Upload LAS/LAZ point clouds for viewing, measurement, and annotation." },
  { icon: Globe, label: "GIS Mapping", desc: "Overlay project data on satellite imagery with layer management." },
  { icon: BarChart3, label: "Volumetric Analysis", desc: "Cut/fill calculations, stockpile measurements, and terrain comparison." },
];

export default function GeospatialShell() {
  return (
    <DashboardTabShell
      category="Data & Analysis"
      title="Geospatial"
      description="Drone surveys, point clouds, GIS mapping, and geospatial data workflows."
      icon={Globe}
      accent="#1E3A8A"
    >
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center">
            <Globe size={20} className="text-[#1E3A8A]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900">Coming Soon</h2>
            <p className="text-sm text-gray-500">Geospatial &amp; Robotics is currently under development.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          Geospatial will provide drone flight planning, point cloud processing,
          GIS mapping, volumetric analysis, and robotic integration for site surveying.
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
          <p className="mt-1 text-xs text-gray-500">Survey data and point clouds are stored through SlateDrop.</p>
        </div>
        <a href="/slatedrop" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-[#1E3A8A]/30 hover:text-[#1E3A8A] transition-colors">
          Open SlateDrop <ArrowRight size={14} />
        </a>
      </div>
    </DashboardTabShell>
  );
}
