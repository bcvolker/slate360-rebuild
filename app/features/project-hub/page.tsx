"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronRight, ChevronLeft, X, Maximize2, Check } from "lucide-react";

const ModelViewer = dynamic(() => import("@/components/ModelViewerClient"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center"><span className="text-gray-400 text-sm">Loading…</span></div>,
});
const highlights = [
  "Project setup: location, phases, team, scope, budget, and schedule",
  "Gantt-style timeline with pop-out for detailed planning",
  "RFI and submittal workflows with structured response tracking",
  "Daily reports, punch lists, and inspection checklists",
  "Role-based access — assign permissions per project and per member",
  "SlateDrop auto-folder creation for every new project",
  "Attach 360° tours and 3D model views to open issues",
  "Export project summaries as PDF or CSV",
];

export default function Page() {
  const [showDemo, setShowDemo] = useState(false);
  
  return (
    <div className="bg-white min-h-screen text-gray-900 antialiased">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <Link href="/features" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#1E3A8A] transition-colors mb-8">
            <ChevronLeft size={12} /> All features
          </Link>
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5" style={{ backgroundColor: "#1E3A8A1A", color: "#1E3A8A" }}>
            Manage
          </span>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none mb-6" style={{ color: "#1E3A8A" }}>
            Project Hub
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mb-8">The command center for every project your team runs — RFIs, submittals, budgets, schedules, and documentation all in one place.</p>
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
          <p className="text-lg text-gray-600 leading-relaxed">Project Hub is built for Business and Enterprise teams who need real project management, not just a to-do list. Set up projects with location (satellite view), phases, stakeholders, budget, and schedule. Execute with structured RFI and submittal workflows, inspection checklists, daily reports, and punch lists. Visualize progress with 360° site tours and 3D model comparisons attached directly to open issues.</p>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black mb-10" style={{ color: "#1E3A8A" }}>What&apos;s included</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((h) => (
              <div key={h} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <Check size={15} style={{ color: "#1E3A8A" }} className="mt-0.5 flex-shrink-0" />
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
              <span className="text-sm font-semibold text-gray-700">3D Model Demo</span>
              <button onClick={() => setShowDemo(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><X size={15} /></button>
            </div>
            <div className="flex-1 relative min-h-0">
              <ModelViewer src="/uploads/csb-stadium-model.glb" alt="3D demo" style={{ width:"100%", height:"100%", background:"#f9fafb" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
