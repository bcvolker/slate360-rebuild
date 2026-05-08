"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Building2, Camera, ChevronDown, ClipboardList, FolderOpen, Loader2, Star, Zap } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";

export type HubProject = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
};

export type HubWalk = {
  id: string;
  title: string;
  status: string;
  projectId: string | null;
  projectName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  isStarred: boolean;
};

type Tab = "recent" | "starred" | "projects";
type CreateState = { kind: "idle" } | { kind: "starting"; target: string } | { kind: "error"; message: string };

export function SiteWalkHub({ projects, walks }: { projects: HubProject[]; walks: HubWalk[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("recent");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(projects[0]?.id ?? null);
  const [createState, setCreateState] = useState<CreateState>({ kind: "idle" });
  const starredWalks = useMemo(() => walks.filter((walk) => walk.isStarred), [walks]);

  async function startWalk(project?: HubProject) {
    const target = project?.id ?? "quick";
    setCreateState({ kind: "starting", target });
    try {
      const response = await fetch("/api/site-walk/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project?.id ?? null,
          session_type: "general",
          title: buildWalkTitle(project?.name),
          metadata: { started_at: new Date().toISOString(), started_from: project ? "hub_project" : "hub_quick" },
          is_ad_hoc: !project,
        }),
      });
      const body = (await response.json().catch(() => null)) as { session?: { id?: string }; error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? `Server error ${response.status}`);
      const sessionId = body?.session?.id;
      if (!sessionId) throw new Error("No session ID returned.");
      router.push(`/site-walk/capture?session=${encodeURIComponent(sessionId)}${project ? "" : "&quick=camera"}`);
    } catch (error) {
      setCreateState({ kind: "error", message: error instanceof Error ? error.message : "Could not start walk." });
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col space-y-4">
      <div className="grid gap-3 grid-cols-2">
        <button type="button" onClick={() => { setActiveTab("projects"); setExpandedProjectId(projects[0]?.id ?? null); }} className="group min-h-24 rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 text-left shadow-[0_22px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:border-amber-400/45 hover:bg-white/[0.09] flex flex-col justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-[0.875rem] bg-amber-500 text-slate-950"><Building2 className="h-5 w-5" /></span>
          <div className="mt-3">
            <span className="block text-lg sm:text-xl font-black text-white leading-tight">Start from Project</span>
            <span className="mt-0.5 hidden sm:block text-xs font-bold text-slate-400">Choose a project and continue.</span>
          </div>
        </button>
        <button type="button" onClick={() => void startWalk()} disabled={createState.kind === "starting"} className="group min-h-24 rounded-[1.5rem] border border-amber-400/35 bg-amber-500 p-4 text-left text-slate-950 shadow-[0_24px_80px_rgba(245,158,11,0.22)] transition hover:bg-amber-400 disabled:opacity-70 flex flex-col justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-[0.875rem] bg-slate-950 text-amber-300">{createState.kind === "starting" && createState.target === "quick" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}</span>
          <div className="mt-3">
            <span className="block text-lg sm:text-xl font-black leading-tight">Quick Walk</span>
            <span className="mt-0.5 hidden sm:block text-xs font-black text-slate-900/75">Open camera now.</span>
          </div>
        </button>
      </div>

      {createState.kind === "error" && <p className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200">{createState.message}</p>}

      <GlassCard className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 p-3 no-scrollbar">
          {(["recent", "starred", "projects"] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${activeTab === tab ? "bg-amber-500 text-slate-950" : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"}`}>
              {tab === "recent" ? "Recent Walks" : tab === "starred" ? "Starred" : "Projects"}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[max(env(safe-area-inset-bottom),2rem)] no-scrollbar">
          {activeTab === "recent" && (
            <div className="space-y-2">
              {walks.length === 0 && <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm font-bold text-slate-400">No walks yet. Start a Quick Walk.</div>}
              {walks.map((walk) => (
                <Link key={walk.id} href={walkHref(walk)} className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-amber-400/40 hover:bg-white/[0.08]">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300"><Camera className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-black text-white">{walk.title}</span>
                    <span className="mt-0.5 block truncate text-xs font-bold text-slate-400">{walk.projectName ?? "Quick Walk"} · {walk.itemCount} capture{walk.itemCount === 1 ? "" : "s"} · {formatDate(walk.updatedAt)}</span>
                  </span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${walk.status === "completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-200"}`}>{walk.status.replaceAll("_", " ")}</span>
                </Link>
              ))}
            </div>
          )}

          {activeTab === "starred" && (
            <div className="space-y-2">
              {starredWalks.length === 0 && <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm font-bold text-slate-400">No starred walks yet.</div>}
              {starredWalks.map((walk) => <Link key={walk.id} href={walkHref(walk)} className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-amber-400/40"><Star className="h-5 w-5 shrink-0 fill-amber-300 text-amber-300" /><span className="min-w-0 flex-1 truncate font-black text-white">{walk.title}</span><span className="text-xs font-bold text-slate-400">{formatDate(walk.updatedAt)}</span></Link>)}
            </div>
          )}

          {activeTab === "projects" && (
            <div className="space-y-2">
              {projects.length === 0 && <Link href="/site-walk/setup" className="block rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm font-bold text-amber-200">Create a field project</Link>}
              {projects.map((project) => {
                const projectWalks = walks.filter((walk) => walk.projectId === project.id);
                const expanded = expandedProjectId === project.id;
                return (
                  <div key={project.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
                    <button type="button" onClick={() => setExpandedProjectId(expanded ? null : project.id)} className="flex w-full items-center gap-3 text-left">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-amber-300"><FolderOpen className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate font-black text-white">{project.name}</span><span className="block text-xs font-bold text-slate-400">{projectWalks.length} walk{projectWalks.length === 1 ? "" : "s"}</span></span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition ${expanded ? "rotate-180" : ""}`} />
                    </button>
                    {expanded && (
                      <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                        <button type="button" onClick={() => void startWalk(project)} disabled={createState.kind === "starting"} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-70">
                          {createState.kind === "starting" && createState.target === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />} Start walk
                        </button>
                        {projectWalks.length === 0 && <p className="rounded-2xl bg-black/20 px-3 py-2 text-center text-xs font-bold text-slate-500">No walks for this project yet.</p>}
                        {projectWalks.map((walk) => <Link key={walk.id} href={walkHref(walk)} className="flex items-center justify-between rounded-2xl bg-black/20 px-3 py-2 text-sm font-bold text-slate-200 hover:text-amber-100"><span className="truncate">{walk.title}</span><span className="ml-3 shrink-0 text-xs text-slate-500">{walk.itemCount}</span></Link>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function buildWalkTitle(projectName?: string) {
  const date = new Date().toISOString().slice(0, 10);
  return projectName ? `${projectName} — Site Walk — ${date}` : `Quick Walk — ${date}`;
}

function walkHref(walk: HubWalk) {
  return walk.status === "completed" ? `/site-walk/walks/${encodeURIComponent(walk.id)}` : `/site-walk/capture?session=${encodeURIComponent(walk.id)}`;
}

function formatDate(value: string) {
  return value.slice(0, 10);
}
