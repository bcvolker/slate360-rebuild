"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertCircle, Building2, Camera, ClipboardList, FileText, FolderOpen, Loader2, RefreshCw, Zap } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { PlanUploaderCard } from "@/components/site-walk/PlanUploaderCard";
import { StatusPanel } from "./StatusPanel";
import { WalkActionsMenu } from "./WalkActionsMenu";
import type { HubProject, HubSummary, HubWalk } from "./siteWalkHubTypes";

type CreateState = { kind: "idle" } | { kind: "starting"; target: string } | { kind: "error"; message: string };

export function SiteWalkHub({ projects, walks, summary }: { projects: HubProject[]; walks: HubWalk[]; summary: HubSummary }) {
  const router = useRouter();
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(projects[0]?.id ?? null);
  const [createState, setCreateState] = useState<CreateState>({ kind: "idle" });
  const activeWalk = useMemo(() => walks.find((walk) => walk.status === "in_progress" || walk.status === "draft") ?? null, [walks]);
  const recentWalks = useMemo(() => walks.slice(0, 12), [walks]);

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
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-3 overflow-hidden lg:gap-4">
      <div className="shrink-0 rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Site Walk</p>
            <h1 className="mt-1 truncate text-xl font-black text-white sm:text-2xl">Field command center</h1>
            <p className="mt-1 text-xs font-bold text-slate-400">Resume work, start capture, and review field activity.</p>
          </div>
          <Link href="/site-walk/walks" className="hidden min-h-11 shrink-0 items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black text-slate-200 hover:border-amber-400/50 hover:text-amber-200 sm:inline-flex">All walks</Link>
        </div>
      </div>

      <div className="grid shrink-0 gap-2 sm:grid-cols-3">
        {activeWalk ? (
          <Link href={walkHref(activeWalk)} className="flex min-h-20 items-center gap-3 rounded-[1.25rem] border border-amber-400/35 bg-amber-500 p-3 text-slate-950 shadow-[0_22px_70px_rgba(245,158,11,0.22)] transition hover:bg-amber-400 sm:col-span-1">
            <Camera className="h-6 w-6 shrink-0" />
            <span className="min-w-0"><span className="block text-sm font-black">Resume Active Walk</span><span className="block truncate text-xs font-black text-slate-900/75">{activeWalk.title}</span></span>
          </Link>
        ) : (
          <div className="flex min-h-20 items-center gap-3 rounded-[1.25rem] border border-dashed border-white/15 bg-white/[0.03] p-3 text-slate-400 sm:col-span-1">
            <Camera className="h-6 w-6 shrink-0" />
            <span className="text-sm font-bold">No active walk yet.</span>
          </div>
        )}
        <Link href="/site-walk/setup" className="flex min-h-20 items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-3 text-white transition hover:border-amber-400/45 hover:bg-white/[0.09]">
          <ClipboardList className="h-6 w-6 shrink-0 text-amber-300" />
          <span><span className="block text-sm font-black">Start New Walk</span><span className="block text-xs font-bold text-slate-400">Setup, project, plans</span></span>
        </Link>
        <button type="button" onClick={() => void startWalk()} disabled={createState.kind === "starting"} className="flex min-h-20 items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-3 text-left text-white transition hover:border-amber-400/45 hover:bg-white/[0.09] disabled:opacity-70">
          {createState.kind === "starting" && createState.target === "quick" ? <Loader2 className="h-6 w-6 shrink-0 animate-spin text-amber-300" /> : <Zap className="h-6 w-6 shrink-0 text-amber-300" />}
          <span><span className="block text-sm font-black">Quick Walk</span><span className="block text-xs font-bold text-slate-400">Open camera now</span></span>
        </button>
      </div>

      {createState.kind === "error" && <p className="shrink-0 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200">{createState.message}</p>}

      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        <StatusPanel icon={AlertCircle} label="Issues / Open Items" count={summary.openItems} empty="No open issues yet." />
        <StatusPanel icon={ClipboardList} label="Needs Review" count={summary.needsReview} empty="No items need review." />
        <StatusPanel icon={FileText} label="Draft Deliverables" count={summary.draftDeliverables} empty="Draft deliverables will appear after you save a report." />
        <StatusPanel icon={RefreshCw} label="Unsynced Items" count={summary.unsyncedItems} empty="No unsynced items." />
      </div>

      <GlassCard className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="flex min-h-0 flex-col border-white/10 lg:border-r">
            <div className="shrink-0 border-b border-white/10 px-4 py-3"><h2 className="text-sm font-black text-white">Recent Walks</h2><p className="text-xs font-bold text-slate-500">Open a walk or manage it from the row menu.</p></div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[max(env(safe-area-inset-bottom),1rem)] no-scrollbar">
              {recentWalks.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm font-bold text-slate-400">No walks yet. Start a Quick Walk or create one from setup.</div>
              ) : (
                <div className="space-y-2">
                  {recentWalks.map((walk) => (
                    <div key={walk.id} className="flex items-center gap-2 rounded-3xl border border-white/10 bg-white/[0.04] p-2 transition hover:border-amber-400/40 hover:bg-white/[0.08]">
                      <Link href={walkHref(walk)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300"><Camera className="h-5 w-5" /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-white">{walk.title}</span><span className="mt-0.5 block truncate text-xs font-bold text-slate-400">{walk.projectName ?? "Quick Walk"} · {walk.itemCount} capture{walk.itemCount === 1 ? "" : "s"} · {formatDate(walk.updatedAt)}</span></span>
                      </Link>
                      <span className={`hidden rounded-full px-2 py-1 text-[10px] font-black uppercase sm:inline-flex ${walk.status === "completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-200"}`}>{walk.status.replaceAll("_", " ")}</span>
                      <WalkActionsMenu walk={walk} projects={projects} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col border-t border-white/10 lg:border-t-0">
            <div className="shrink-0 border-b border-white/10 px-4 py-3"><h2 className="text-sm font-black text-white">Field Projects</h2><p className="text-xs font-bold text-slate-500">Start from a project or open its plan room.</p></div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 no-scrollbar">
              {projects.length === 0 ? (
                <Link href="/site-walk/setup" className="block rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm font-bold text-amber-200">Create a Field Project to organize walks.</Link>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => {
                    const projectWalks = walks.filter((walk) => walk.projectId === project.id);
                    const expanded = expandedProjectId === project.id;
                    return (
                      <div key={project.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
                        <button type="button" onClick={() => setExpandedProjectId(expanded ? null : project.id)} className="flex min-h-12 w-full items-center gap-3 text-left">
                          <FolderOpen className="h-5 w-5 shrink-0 text-amber-300" />
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-white">{project.name}</span><span className="block text-xs font-bold text-slate-400">{projectWalks.length} walk{projectWalks.length === 1 ? "" : "s"}</span></span>
                        </button>
                        {expanded && (
                          <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                            <button type="button" onClick={() => void startWalk(project)} disabled={createState.kind === "starting"} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-70">
                              {createState.kind === "starting" && createState.target === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />} Start from Project
                            </button>
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3"><PlanUploaderCard project={project} /></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
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
