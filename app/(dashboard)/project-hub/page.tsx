"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, FolderKanban, Loader2 } from "lucide-react";
import CreateProjectWizard, { CreateProjectPayload } from "@/components/project-hub/CreateProjectWizard";

export default function ProjectHubPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadProjects = async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json();
      setProjects(data.projects || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreate = async (payload: CreateProjectPayload) => {
    setCreating(true);
    try {
      await fetch("/api/projects/create", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      setWizardOpen(false);
      await loadProjects();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header matching the rest of the app */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-[#FF4D00] mb-2">
              <ChevronLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <FolderKanban size={28} className="text-[#1E3A8A]" /> Project Hub
            </h1>
          </div>
          <button onClick={() => setWizardOpen(true)} className="flex items-center gap-2 rounded-xl bg-[#FF4D00] px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#E64500] transition-transform hover:-translate-y-0.5">
            <Plus size={16} /> New Project
          </button>
        </div>

        {/* The Horizontal Carousel */}
        {loading ? (
          <div className="flex justify-center p-20 text-gray-400"><Loader2 className="animate-spin" /></div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-20 text-center text-gray-500">
            No projects found. Click "New Project" to start building your folder structures.
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar">
            {projects.map((p) => (
              <Link key={p.id} href={`/project-hub/${p.id}`} className="group relative flex w-[340px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="h-32 w-full bg-gradient-to-br from-[#1E3A8A] to-slate-800 p-4 flex flex-col justify-between">
                  <span className="self-end rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md uppercase tracking-wider">{p.status}</span>
                  <h2 className="text-xl font-black text-white truncate">{p.name}</h2>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <p className="text-sm text-gray-500 line-clamp-2">{p.description || "No description provided."}</p>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs font-semibold text-gray-400">
                    <span>Created: {new Date(p.created_at).toLocaleDateString()}</span>
                    <span className="text-[#FF4D00] group-hover:underline">Open Hub &rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateProjectWizard open={wizardOpen} creating={creating} error={null} onClose={() => setWizardOpen(false)} onSubmit={handleCreate} />
    </div>
  );
}