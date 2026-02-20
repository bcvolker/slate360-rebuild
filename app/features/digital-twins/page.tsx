"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";

const highlights = [
  "Gaussian Splatting — create photorealistic, real-time explorable 3D scenes from photos or video",
  "NeRF (Neural Radiance Fields) — AI-generated volumetric reconstructions for complex environments",
  "Photogrammetry pipeline — COLMAP + OpenMVS for high-fidelity mesh-based digital twins",
  "LiDAR point-cloud ingest — upload LAS/LAZ scans and convert to Potree or Cesium 3D Tiles",
  "Version-diff comparison — overlay two scans or models to visualize change over time",
  "Flatness heatmaps and thermal overlays for quality-assurance inspections",
  "GPU-accelerated processing — all heavy computation runs on cloud GPUs, not your machine",
  "Export to GLB, OBJ, 3D Tiles, or point-cloud formats for use in any downstream tool",
];

export default function Page() {
  return (
    <div className="bg-white min-h-screen text-gray-900 antialiased">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/features"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#FF4D00] transition-colors mb-8"
          >
            <ChevronLeft size={12} /> All features
          </Link>
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5"
            style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}
          >
            Capture
          </span>
          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none mb-6"
            style={{ color: "#1E3A8A" }}
          >
            Digital Twin Creation
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mb-8">
            Gaussian Splatting, NeRF, and photogrammetry options to build
            photorealistic digital twins from photos, video, or LiDAR scans.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-base text-white transition-all hover:opacity-90 hover:scale-105"
            style={{ backgroundColor: "#FF4D00" }}
          >
            Start free trial <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* Description */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-gray-600 leading-relaxed">
            Capture the real world in full fidelity. Upload a set of photos, a
            drone video, or a LiDAR point cloud and Slate360 builds a
            navigable 3D digital twin — everything from a quick Gaussian Splat
            preview to a precision-grade photogrammetry mesh. Compare versions
            over time, run QA overlays, and share the result across every module
            in the platform.
          </p>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-3xl font-black mb-10"
            style={{ color: "#1E3A8A" }}
          >
            What&apos;s included
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((h) => (
              <div
                key={h}
                className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50"
              >
                <Check
                  size={15}
                  style={{ color: "#FF4D00" }}
                  className="mt-0.5 flex-shrink-0"
                />
                <span className="text-sm text-gray-600 leading-relaxed">
                  {h}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50 text-center">
        <div className="max-w-xl mx-auto">
          <h2
            className="text-3xl font-black mb-4"
            style={{ color: "#1E3A8A" }}
          >
            Build your first digital twin
          </h2>
          <p className="text-gray-500 mb-8">
            No credit card required. Cancel anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
              style={{ backgroundColor: "#FF4D00" }}
            >
              Start free trial <ChevronRight size={16} />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all"
            >
              All features
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
