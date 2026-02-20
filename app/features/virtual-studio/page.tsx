"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronRight, ChevronLeft, X, Maximize2, Check } from "lucide-react";

const highlights = [
  "Cloud-rendered photorealistic images from your 3D models",
  "Animated fly-through MP4 export for client presentations",
  "Material and lighting presets for fast results",
  "Branded PDF presentation builder for bid packages",
  "Direct import from Design Studio with scene state preserved",
  "360° panoramic render output for virtual site previews",
  "Pop-out preview window for second monitor workflows",
  "Processing queue with real-time status notifications",
];
const gallery = [
  { id: 1, label: "Render Queue", bg: "from-purple-50 to-gray-50", emoji: "⚡", desc: "Cloud GPU render queue with per-job status, preview thumbnails, and download links" },
  { id: 2, label: "Material Editor", bg: "from-violet-50 to-gray-50", emoji: "🎨", desc: "Drag-and-drop material presets over your model surfaces" },
  { id: 3, label: "Animation Timeline", bg: "from-indigo-50 to-gray-50", emoji: "🎬", desc: "Set camera keyframes and export MP4 in one click" },
  { id: 4, label: "Presentation Builder", bg: "from-blue-50 to-purple-50", emoji: "📊", desc: "Branded layout with your logo, renders, and project details — export as PDF" },
];
export default function Page() {
  const [showDemo, setShowDemo] = useState(false); const [galleryIdx, setGalleryIdx] = useState(0);
  const current = gallery[galleryIdx];
  return (
    <div className="bg-white min-h-screen text-gray-900 antialiased">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <Link href="/features" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#FF4D00] transition-colors mb-8">
            <ChevronLeft size={12} /> All features
          </Link>
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5" style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}>
            Present
          </span>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none mb-6" style={{ color: "#1E3A8A" }}>
            Virtual Studio
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mb-8">Turn your 3D models and site captures into photorealistic renderings, fly-through animations, and polished client presentations.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-base text-white transition-all hover:opacity-90 hover:scale-105" style={{ backgroundColor: "#FF4D00" }}>
              Start free trial <ChevronRight size={16} />
            </Link>
            <button onClick={() => setShowDemo(true)} className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-base border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all">
              <Maximize2 size={16} /> Try Demo
            </button>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-gray-600 leading-relaxed">Virtual Studio is where your models come to life. Import directly from Design Studio, add materials and lighting, and render photorealistic images or MP4 fly-throughs in the cloud. Create branded PDF and video presentations for bid packages, owner reviews, and progress reports — all without leaving Slate360.</p>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black mb-10" style={{ color: "#1E3A8A" }}>What&apos;s included</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((h) => (
              <div key={h} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <Check size={15} style={{ color: "#FF4D00" }} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600 leading-relaxed">{h}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-black mb-4" style={{ color: "#1E3A8A" }}>Ready to get started?</h2>
          <p className="text-gray-500 mb-8">No credit card required. Cancel anytime.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-white transition-all hover:opacity-90 hover:scale-105" style={{ backgroundColor: "#FF4D00" }}>
              Start free trial <ChevronRight size={16} />
            </Link>
            <Link href="/features" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all">
              All features
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      
      {showDemo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowDemo(false)}>
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col w-[90vw] h-[90vh] sm:w-[65vw] sm:h-[65vh] max-w-5xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <span className="text-sm font-semibold text-gray-700">{gallery[galleryIdx].label}</span>
              <button onClick={() => setShowDemo(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><X size={15} /></button>
            </div>
            <div className={`flex-1 bg-gradient-to-br ${gallery[galleryIdx].bg} flex items-center justify-center`}>
              <div className="text-center px-6">
                <div className="text-7xl mb-4">{gallery[galleryIdx].emoji}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{gallery[galleryIdx].label}</h3>
                <p className="text-gray-500">{gallery[galleryIdx].desc}</p>
                <div className="flex gap-3 justify-center mt-6">
                  <button onClick={() => setGalleryIdx(i => (i - 1 + gallery.length) % gallery.length)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"><ChevronLeft size={18} /></button>
                  <button onClick={() => setGalleryIdx(i => (i + 1) % gallery.length)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"><ChevronRight size={18} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
