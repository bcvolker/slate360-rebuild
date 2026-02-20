"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronRight, ChevronLeft, X, Maximize2, Check } from "lucide-react";

const highlights = [
  "Finder/Explorer-style folder tree with solid icons and labels",
  "Drag-and-drop uploads with real-time progress indicators",
  "Right-click Secure Send — instantly share with external stakeholders",
  "System folders auto-created per tab (Design Studio, Project Hub, etc.)",
  "Projects folder with full subfolder hierarchy for Business/Enterprise",
  "Granular share permissions: upload, download, folder-level scoping",
  "Time-limited share links for clients and external reviewers",
  "Context-aware file opening — a PDF opens in Plan Review automatically",
];
const gallery = [
  { id: 1, label: "Folder Tree", bg: "from-orange-50 to-gray-50", emoji: "📂", desc: "Sidebar folder tree with solid icons, locked system folders, and editable user folders" },
  { id: 2, label: "Grid View", bg: "from-amber-50 to-gray-50", emoji: "🗂️", desc: "Visual grid with thumbnails, file size, and last-modified dates" },
  { id: 3, label: "Secure Send", bg: "from-yellow-50 to-gray-50", emoji: "📤", desc: "Right-click any file to generate a scoped, time-limited share link" },
  { id: 4, label: "Project Folders", bg: "from-orange-50 to-amber-50", emoji: "🏗️", desc: "Auto-created project subfolder hierarchy for every Project Hub project" },
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
            Organize
          </span>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none mb-6" style={{ color: "#1E3A8A" }}>
            SlateDrop
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mb-8">Your Finder-style file system for every project and tab. Drag, drop, right-click Secure Send — every file always where it belongs.</p>
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
          <p className="text-lg text-gray-600 leading-relaxed">SlateDrop is the single unified file system for everything in Slate360. It behaves exactly like Mac Finder or Windows Explorer — folder tree, list/grid/details view, drag-and-drop, and right-click context menus. System folders are auto-created per tab and per project. All files are accessible from every module with full share and permission controls.</p>
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
