"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronRight, ChevronLeft, X, Maximize2, Check } from "lucide-react";

const highlights = [
  "Portfolio-level dashboards with project status, budget, and progress",
  "Credit consumption trends and monthly usage breakdowns",
  "Team activity feed across all projects and modules",
  "Exportable PDF and CSV reports for stakeholder meetings",
  "Per-project analytics with RFI counts, submittal timelines, and change orders",
  "Storage usage and processing job history at a glance",
  "Customizable widgets for the dashboard home screen",
  "Enterprise-tier: organization-wide rollups with role-based visibility",
];

const gallery = [
  { id: 1, label: "Portfolio Dashboard", bg: "from-blue-50 to-gray-50", emoji: "📊", desc: "Bird's-eye view of all active projects with status, budget burn, and team assignments" },
  { id: 2, label: "Credit Trends", bg: "from-indigo-50 to-gray-50", emoji: "📈", desc: "Monthly credit consumption chart with forecasting and usage breakdown" },
  { id: 3, label: "Report Generator", bg: "from-sky-50 to-gray-50", emoji: "📄", desc: "Build exportable multi-page reports combining data from any module" },
  { id: 4, label: "Activity Feed", bg: "from-cyan-50 to-blue-50", emoji: "🔔", desc: "Real-time stream of updates across all projects, filtered by role" },
];

export default function Page() {
  const [showDemo, setShowDemo] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
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
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5" style={{ backgroundColor: "#1E3A8A1A", color: "#1E3A8A" }}>
            Analyze
          </span>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-tight mb-5" style={{ color: "#1E3A8A" }}>
            Analytics & Reports
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl leading-relaxed mb-8">
            Portfolio dashboards, credit trends, team activity, and exportable reports — the data layer that makes every other module smarter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-white transition-all hover:opacity-90 hover:scale-105" style={{ backgroundColor: "#FF4D00" }}>
              Start free trial <ChevronRight size={16} />
            </Link>
            <button onClick={() => setShowDemo(true)} className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all">
              Try Demo
            </button>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-10" style={{ color: "#1E3A8A" }}>What you can do</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((h) => (
              <div key={h} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-200">
                <Check size={16} style={{ color: "#FF4D00" }} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 leading-relaxed">{h}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 text-white" style={{ backgroundColor: "#1E3A8A" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black tracking-tight mb-4">Know exactly where every project stands.</h2>
          <p className="text-blue-200 text-lg mb-8">Real-time portfolio intelligence, not static spreadsheets.</p>
          <Link href="/signup" className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full font-semibold text-white transition-all hover:opacity-90 hover:scale-105" style={{ backgroundColor: "#FF4D00" }}>
            Start free trial <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />

      {/* Demo Modal */}
      {showDemo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowDemo(false)}>
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col w-[90vw] h-[90vh] sm:w-[65vw] sm:h-[65vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <span className="text-sm font-semibold text-gray-700">Analytics & Reports — {current.label}</span>
              <button onClick={() => setShowDemo(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors" aria-label="Close">
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 relative flex items-center justify-center p-8">
              <div className={`w-full h-full rounded-xl bg-gradient-to-br ${current.bg} flex flex-col items-center justify-center p-8 text-center`}>
                <span className="text-6xl mb-4">{current.emoji}</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{current.label}</h3>
                <p className="text-sm text-gray-500 max-w-md">{current.desc}</p>
              </div>
              {gallery.length > 1 && (
                <>
                  <button onClick={() => setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 z-10">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 z-10">
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 pb-4">
              {gallery.map((_, i) => (
                <button key={i} onClick={() => setGalleryIdx(i)} className={`w-2 h-2 rounded-full transition-colors ${i === galleryIdx ? "bg-[#FF4D00]" : "bg-gray-300"}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
