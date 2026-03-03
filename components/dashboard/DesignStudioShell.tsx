"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { Palette, Upload, Layers, Cuboid, FileImage, ArrowRight } from "lucide-react";

const COMING_FEATURES = [
  { icon: Cuboid, label: "3D Model Viewer", desc: "Upload and view GLTF, GLB, OBJ, FBX, and IFC models in-browser." },
  { icon: FileImage, label: "2D Plan Viewer", desc: "Annotate and compare PDF drawings, blueprints, and plans." },
  { icon: Layers, label: "BIM Coordination", desc: "Clash detection, model overlays, and multi-discipline coordination." },
  { icon: Upload, label: "File Processing", desc: "Gaussian splatting, point cloud, and mesh reconstruction from photos." },
];

export default function DesignStudioShell() {
  return (
    <DashboardTabShell
      category="Creative Tools"
      title="Design Studio"
      description="3D modelling, BIM coordination, and real-time design collaboration."
      icon={Palette}
      accent="#FF4D00"
    >
      {/* Status banner */}
      <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-white p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-[#FF4D00]/10 flex items-center justify-center">
            <Palette size={20} className="text-[#FF4D00]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900">Coming Soon</h2>
            <p className="text-sm text-gray-500">Design Studio is currently under development.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          Design Studio will be the central workspace for 3D models, 2D plans, BIM coordination,
          and GPU-powered processing. Files are managed through SlateDrop integration.
        </p>
      </div>

      {/* Planned features grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {COMING_FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 flex items-start gap-4"
            >
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

      {/* SlateDrop link */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">File Management</h3>
          <p className="mt-1 text-xs text-gray-500">
            Design files will be stored and versioned through SlateDrop.
          </p>
        </div>
        <a
          href="/slatedrop"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-[#FF4D00]/30 hover:text-[#FF4D00] transition-colors"
        >
          Open SlateDrop <ArrowRight size={14} />
        </a>
      </div>
    </DashboardTabShell>
  );
}
