"use client";

import { useState } from "react";
import Link from "next/link";
import GlassCard from "@/components/shared/GlassCard";
import { Building2, Construction, FileText, MoreVertical, Play, Plus, MapPin, Trash2, Link as LinkIcon, Users, Rocket, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteWalkHub({
  projects,
  walks,
  reports,
  tier,
}: {
  projects: any[];
  walks: any[];
  reports: any[];
  tier: string;
}) {
  const [activeTab, setActiveTab] = useState<"setup" | "walks" | "deliverables">("setup");

  const canCreateFullProject = ["business", "enterprise"].includes(tier);

  return (
    <div className="w-full space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Site Walk Hub</h1>
        <p className="text-sm text-slate-400 mt-1">Manage field setup, conduct mobile walks, and generate client deliverables.</p>
      </header>

      {/* Tabs */}
      <div className="flex w-full overflow-x-auto border-b border-white/10 no-scrollbar">
        {[
          { id: "setup", label: "Setup & Plans" },
          { id: "walks", label: "My Walks" },
          { id: "deliverables", label: "Deliverables" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`whitespace-nowrap px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-amber-400 text-amber-400"
                : "border-b-2 border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === "setup" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section>
              <h2 className="mb-4 text-base font-bold text-white">Start a Project</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {canCreateFullProject && (
                  <GlassCard className="flex flex-col items-center justify-center p-6 text-center hover:bg-slate-900/60 transition-colors cursor-pointer group">
                    <Building2 className="mb-3 h-8 w-8 text-amber-500 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-slate-50">New Full Project</span>
                    <span className="mt-1 text-xs text-slate-400">Construction management, bids, full workspace</span>
                  </GlassCard>
                )}
                <GlassCard className="flex flex-col items-center justify-center p-6 text-center hover:bg-slate-900/60 transition-colors cursor-pointer group">
                  <Construction className="mb-3 h-8 w-8 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-50">New Field Project</span>
                  <span className="mt-1 text-xs text-slate-400">Lightweight wrapper for field capture & plans</span>
                </GlassCard>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-base font-bold text-white">Floor Plans</h2>
              <GlassCard className="flex flex-col items-center justify-center p-8 border-dashed border-white/20 bg-transparent hover:bg-white/[0.02] transition-colors">
                <UploadCloud className="h-8 w-8 text-slate-500 mb-3" />
                <p className="text-sm font-semibold text-slate-300">Upload Plan Sets</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">Upload PDFs to pin issues during field walks. Drop files here or click to browse.</p>
                <Button className="mt-4 bg-slate-800 text-slate-100 hover:bg-slate-700" size="sm">Browse Files</Button>
              </GlassCard>
            </section>
          </div>
        )}

        {activeTab === "walks" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {walks.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <MapPin className="mx-auto h-8 w-8 text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">No walks found.</p>
              </GlassCard>
            ) : (
              <div className="grid gap-4">
                {walks.map((w: any) => (
                  <GlassCard key={w.id} className="flex items-center justify-between p-4 bg-slate-950/40 hover:bg-slate-900/60 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-50">{w.name}</span>
                      <span className="text-xs text-slate-400">{w.date} &middot; {w.project}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {w.status === "in_progress" && (
                        <Button className="bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold gap-2 text-xs h-8">
                          <Rocket className="h-4 w-4" /> Continue Walk
                        </Button>
                      )}
                      
                      <div className="relative group cursor-pointer p-2 hover:bg-white/10 rounded-full">
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                        <div className="absolute right-0 top-10 w-48 rounded-xl border border-white/10 bg-slate-900 p-1 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-white/10">
                            <LinkIcon className="h-3.5 w-3.5" /> Link to Project
                          </button>
                          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-white/10">
                            <Users className="h-3.5 w-3.5" /> Manage Access / Assign
                          </button>
                          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-400 hover:bg-red-400/10 hover:text-red-300">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "deliverables" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-white">Generated Reports</h2>
              <Button className="bg-slate-800 text-slate-100 hover:bg-slate-700 gap-1 h-8 text-xs font-bold">
                <Plus className="h-3 w-3" /> Create New Report
              </Button>
            </div>
            
            {reports.length === 0 ? (
              <GlassCard className="p-8 text-center border-dashed border-white/10">
                <FileText className="mx-auto h-8 w-8 text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">No deliverables generated yet.</p>
                <p className="text-xs text-slate-500 mt-1">Complete a walk to build a report.</p>
              </GlassCard>
            ) : (
              <div className="grid gap-4">
                 {/* Reports map here */}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
