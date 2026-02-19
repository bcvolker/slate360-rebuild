"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ChevronRight, X, Maximize2, Check, ChevronLeft } from "lucide-react";

const ModelViewer = dynamic(() => import("@/components/ModelViewerClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
      <span className="text-white/30 text-sm">Loading 3D model…</span>
    </div>
  ),
});

const highlights = [
  "Cloud GPU workers — your laptop never slows down",
  "Automated 3D model optimization (Draco compression, LOD)",
  "GLB/GLTF processing pipeline with auto-validation",
  "360° stitching and equirectangular export at full resolution",
  "Background job queue with real-time status notifications",
  "Retry and error-recovery built in — zero lost jobs",
  "Processing credits rollover monthly — generous defaults",
  "Per-project processing history and audit logs",
];

const gallery = [
  { id: 1, label: "Job Queue", bg: "from-emerald-950/60 to-zinc-950", desc: "All pending, active, and completed GPU jobs in one view" },
  { id: 2, label: "3D Processing", bg: "from-green-950/60 to-zinc-950", desc: "GLB optimization, Draco compression, LOD generation" },
  { id: 3, label: "360° Stitching", bg: "from-teal-950/60 to-zinc-950", desc: "Full-resolution equirectangular output in the cloud" },
  { id: 4, label: "Credit Usage", bg: "from-lime-950/60 to-zinc-950", desc: "Real-time credit balance with rollover tracking" },
];

export default function RenderingFeaturePage() {
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const current = gallery[galleryIdx];

  return (
    <div className="bg-black min-h-screen text-white antialiased">
      <Navbar />

      <section className="pt-36 pb-16 px-6 md:px-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/features" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-8">
            <ChevronLeft size={12} /> All Features
          </Link>
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5" style={{ backgroundColor: "#1E3A8A22", color: "#60a5fa" }}>
            Process
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6">GPU Rendering</h1>
          <p className="text-xl text-white/55 leading-relaxed max-w-2xl mb-8">
            Heavy 3D processing, 360° stitching, and format optimization — all handled 
            in the cloud. Your laptop stays fast. Your turnaround stays tight.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/plans" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-base transition-all hover:opacity-90 hover:scale-105" style={{ backgroundColor: "#FF4D00", color: "#fff" }}>
              Start Free Trial <ChevronRight size={16} />
            </Link>
            <button onClick={() => setShow3D(true)} className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-base border border-white/20 hover:bg-white/5 transition-all">
              <Maximize2 size={16} /> View Processed 3D Model
            </button>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 md:px-8 bg-zinc-950/50">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Feature Preview</h2>
            <button onClick={() => setExpanded(true)} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-white/20 hover:bg-white/5 transition-colors">
              <Maximize2 size={14} /> Expand
            </button>
          </div>
          <div className={`relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br ${current.bg} aspect-video flex items-center justify-center shadow-2xl`}>
            <div className="text-center px-8">
              <div className="text-6xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold mb-2">{current.label}</h3>
              <p className="text-white/50 text-sm">{current.desc}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-5">
            <button onClick={() => setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><ChevronLeft size={16} /></button>
            <div className="flex gap-2">
              {gallery.map((_, i) => (
                <button key={i} onClick={() => setGalleryIdx(i)} className={`h-2 rounded-full transition-all duration-200 ${i === galleryIdx ? "w-6" : "w-2 bg-white/30"}`} style={i === galleryIdx ? { backgroundColor: "#FF4D00" } : {}} />
              ))}
            </div>
            <button onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-10">What&apos;s included</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((h) => (
              <div key={h} className="flex items-start gap-3 p-4 rounded-xl border border-white/8 bg-white/[0.02]">
                <Check size={15} className="mt-0.5 flex-shrink-0" style={{ color: "#FF4D00" }} />
                <span className="text-sm text-white/70 leading-relaxed">{h}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-8 bg-zinc-950/50 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Broadcast-quality. Cloud-speed.</h2>
          <p className="text-white/50 mb-8">Start your free trial — no credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/plans" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:opacity-90 hover:scale-105" style={{ backgroundColor: "#FF4D00", color: "#fff" }}>
              Start Free Trial <ChevronRight size={16} />
            </Link>
            <Link href="/features" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold border border-white/20 hover:bg-white/5 transition-all">
              All Features
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {expanded && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
            <span className="text-sm font-semibold text-white/80">GPU Rendering — {current.label}</span>
            <button onClick={() => setExpanded(false)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><X size={18} /></button>
          </div>
          <div className={`flex-1 bg-gradient-to-br ${current.bg} flex items-center justify-center`}>
            <div className="text-center px-8">
              <div className="text-8xl mb-6">⚡</div>
              <h3 className="text-3xl font-bold mb-3">{current.label}</h3>
              <p className="text-white/50">{current.desc}</p>
              <div className="flex gap-4 justify-center mt-8">
                <button onClick={() => setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><ChevronLeft size={20} /></button>
                <button onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><ChevronRight size={20} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {show3D && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 bg-black/90 border-b border-white/10 flex-shrink-0">
            <span className="text-sm font-semibold text-white/80">GPU-Processed 3D Model</span>
            <button onClick={() => setShow3D(false)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><X size={18} /></button>
          </div>
          <div className="flex-1 relative min-h-0">
            <ModelViewer
              src="/uploads/csb-stadium-model.glb"
              alt="GPU-processed 3D model"
              style={{ width: "100%", height: "100%", background: "#0a0a0a" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
