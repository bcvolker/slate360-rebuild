"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ChevronRight, X, Maximize2, Check, ChevronLeft } from "lucide-react";

const highlights = [
  "Sports-specific template library (100+ pre-built layouts)",
  "Drag-and-drop layer editor with unlock/lock controls",
  "Brand kit management — upload logos, fonts, palettes",
  "AI-assisted background removal and object isolation",
  "One-click export to social, broadcast, and print formats",
  "Version history — roll back any design in seconds",
  "Real-time team collaboration with comment threads",
  "GPU-accelerated rendering for large-format outputs",
];

const gallery = [
  { id: 1, label: "Template Gallery", bg: "from-orange-950/60 to-zinc-950", desc: "100+ sports templates ready to go" },
  { id: 2, label: "Layer Editor", bg: "from-blue-950/60 to-zinc-950", desc: "Full layer control with grouping & locking" },
  { id: 3, label: "Brand Kit", bg: "from-purple-950/60 to-zinc-950", desc: "Upload fonts, logos, and color palettes" },
  { id: 4, label: "Export Panel", bg: "from-green-950/60 to-zinc-950", desc: "Social, broadcast, and print — one click" },
];

export default function DesignStudioPage() {
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const current = gallery[galleryIdx];

  return (
    <div className="bg-black min-h-screen text-white antialiased">
      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-16 px-6 md:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/features"
            className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-8"
          >
            <ChevronLeft size={12} /> All Features
          </Link>
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5"
            style={{ backgroundColor: "#FF4D0022", color: "#FF4D00" }}
          >
            Design
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6">
            Design Studio
          </h1>
          <p className="text-xl text-white/55 leading-relaxed max-w-2xl mb-8">
            A professional-grade composition environment built specifically for sports media. 
            Create broadcast graphics, social content, and event programs — without a design team.
          </p>
          <Link
            href="/plans"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-base transition-all duration-200 hover:opacity-90 hover:scale-105"
            style={{ backgroundColor: "#FF4D00", color: "#fff" }}
          >
            Start Free Trial <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* Interactive Gallery */}
      <section className="py-16 px-6 md:px-8 bg-zinc-950/50">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Feature Preview</h2>
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-white/20 hover:bg-white/5 transition-colors"
            >
              <Maximize2 size={14} /> Expand
            </button>
          </div>

          {/* Carousel */}
          <div className={`relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br ${current.bg} aspect-video flex items-center justify-center shadow-2xl`}>
            <div className="text-center px-8">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-2xl font-bold mb-2">{current.label}</h3>
              <p className="text-white/50 text-sm">{current.desc}</p>
            </div>
          </div>

          {/* Dots + Arrows */}
          <div className="flex items-center justify-center gap-4 mt-5">
            <button
              onClick={() => setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-2">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setGalleryIdx(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${i === galleryIdx ? "w-6" : "bg-white/30"}`}
                  style={i === galleryIdx ? { backgroundColor: "#FF4D00" } : {}}
                />
              ))}
            </div>
            <button
              onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Highlights */}
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

      {/* CTA */}
      <section className="py-20 px-6 md:px-8 bg-zinc-950/50 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to design like a pro?</h2>
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

      {/* Expanded Modal */}
      {expanded && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
            <span className="text-sm font-semibold text-white/80">Design Studio — {current.label}</span>
            <button onClick={() => setExpanded(false)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className={`flex-1 bg-gradient-to-br ${current.bg} flex items-center justify-center`}>
            <div className="text-center px-8">
              <div className="text-8xl mb-6">🎨</div>
              <h3 className="text-3xl font-bold mb-3">{current.label}</h3>
              <p className="text-white/50">{current.desc}</p>
              <div className="flex gap-4 justify-center mt-8">
                <button onClick={() => setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
