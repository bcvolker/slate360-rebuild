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
type WorkTab = "recent" | "projects" | "issues" | "drafts";

export function SiteWalkHub({ projects, walks, summary, orgName }: { projects: HubProject[]; walks: HubWalk[]; summary: HubSummary; orgName?: string | null }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkTab>("recent");
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
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-2 overflow-hidden lg:gap-3">
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 backdrop-blur-xl">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Site Walk</p>
          <p className="truncate text-xs font-bold text-slate-400">{orgName ?? "Field workspace"}</p>
        </div>
        <Link href="/site-walk/walks" className="inline-flex min-h-9 shrink-0 items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black text-slate-200 hover:border-amber-400/50 hover:text-amber-200">All walks</Link>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        {activeWalk ? (
          <Link href={walkHref(activeWalk)} className="flex min-h-14 items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/90 px-3 py-2 text-slate-950 shadow-[0_12px_38px_rgba(245,158,11,0.16)] transition hover:bg-amber-400">
            <Camera className="h-4 w-4 shrink-0" />
            <span className="min-w-0"><span className="block text-xs font-black">Resume Walk</span><span className="block truncate text-[10px] font-black text-slate-900/75">{activeWalk.title}</span></span>
          </Link>
        ) : (
          <div className="flex min-h-14 items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-2 text-slate-400">
            <Camera className="h-4 w-4 shrink-0" />
            <span className="text-xs font-bold">No active walk</span>
          </div>
        )}
        <Link href="/site-walk/setup" className="flex min-h-14 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-white transition hover:border-amber-400/45 hover:bg-white/[0.09]">
          <ClipboardList className="h-4 w-4 shrink-0 text-amber-300" />
          <span><span className="block text-xs font-black">Setup Walk</span><span className="block text-[10px] font-bold text-slate-400">Project + plans</span></span>
        </Link>
        <button type="button" onClick={() => void startWalk()} disabled={createState.kind === "starting"} className="flex min-h-14 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-white transition hover:border-amber-400/45 hover:bg-white/[0.09] disabled:opacity-70">
          {createState.kind === "starting" && createState.target === "quick" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-300" /> : <Zap className="h-4 w-4 shrink-0 text-amber-300" />}
          <span><span className="block text-xs font-black">Quick Capture</span><span className="block text-[10px] font-bold text-slate-400">Camera-only</span></span>
        </button>
        <button type="button" onClick={() => setActiveTab("projects")} className="flex min-h-14 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-white transition hover:border-amber-400/45 hover:bg-white/[0.09]">
          <Building2 className="h-4 w-4 shrink-0 text-amber-300" />
          <span><span className="block text-xs font-black">From Project</span><span className="block text-[10px] font-bold text-slate-400">Field projects</span></span>
        </button>
      </div>

      {createState.kind === "error" && <p className="shrink-0 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200">{createState.message}</p>}

      <div className="flex shrink-0 gap-2 overflow-x-auto pb-0.5 no-scrollbar" aria-label="Site Walk status filters">
        <StatusPanel icon={AlertCircle} label="Open Items" count={summary.openItems} active={activeTab === "issues"} onClick={() => setActiveTab("issues")} />
        <StatusPanel icon={ClipboardList} label="Needs Review" count={summary.needsReview} active={activeTab === "issues"} onClick={() => setActiveTab("issues")} />
        <StatusPanel icon={RefreshCw} label="Unsynced" count={summary.unsyncedItems} active={activeTab === "recent" && summary.unsyncedItems > 0} onClick={() => setActiveTab("recent")} />
        <StatusPanel icon={FileText} label="Draft Reports" count={summary.draftDeliverables} active={activeTab === "drafts"} onClick={() => setActiveTab("drafts")} />
      </div>

      <GlassCard className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="flex shrink-0 gap-1 border-b border-white/10 p-2" role="tablist" aria-label="Site Walk command panels">
          {(["recent", "projects", "issues", "drafts"] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`min-h-9 flex-1 rounded-xl px-2 text-xs font-black capitalize transition ${activeTab === tab ? "bg-amber-500 text-slate-950" : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"}`}>{tab}</button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[max(env(safe-area-inset-bottom),1rem)] no-scrollbar">
          {activeTab === "recent" && (
            <section className="space-y-2">
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
            </section>
          )}

          {activeTab === "projects" && (
            <section className="space-y-2">
              {projects.length === 0 ? (
                <Link href="/site-walk/setup" className="block rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm font-bold text-amber-200">No field projects yet. Start from a project or create one.</Link>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => {
                    const projectWalks = walks.filter((walk) => walk.projectId === project.id);
                    const expanded = expandedProjectId === project.id;
                    return (
                      <div key={project.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
                        <button type="button" onClick={() => setExpandedProjectId(expanded ? null : project.id)} className="flex min-h-12 w-full items-center gap-3 text-left">
                          <FolderOpen className="h-5 w-5 shrink-0 text-amber-300" />
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-white">{project.name}</span><span className="block text-xs font-bold text-slate-400">{projectWalks.length} open walk{projectWalks.length === 1 ? "" : "s"} · Last activity {lastProjectActivity(projectWalks)}</span></span>
                        </button>
                        {expanded && (
                          <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                            <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => void startWalk(project)} disabled={createState.kind === "starting"} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-amber-500 px-2 text-[11px] font-black text-slate-950 hover:bg-amber-400 disabled:opacity-70">
                              {createState.kind === "starting" && createState.target === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />} Start from Project
                            </button>
                            <button type="button" onClick={() => setExpandedProjectId(project.id)} className="min-h-10 rounded-xl border border-white/10 bg-white/[0.05] px-2 text-[11px] font-black text-slate-200">Plan Room</button>
                            <Link href={`/projects/${encodeURIComponent(project.id)}`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-2 text-[11px] font-black text-slate-200">More</Link>
                            </div>
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3"><PlanUploaderCard project={project} /></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === "issues" && (
            <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm font-bold text-slate-400">
              {summary.openItems + summary.needsReview > 0 ? "Open items are tracked in saved walks. Open a recent walk to review and update them." : "No open issues yet."}
            </section>
          )}

          {activeTab === "drafts" && (
            <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm font-bold text-slate-400">
              {summary.draftDeliverables > 0 ? <Link href="/site-walk/deliverables" className="text-amber-200 underline underline-offset-4">Open draft deliverables</Link> : "Draft deliverables will appear after you save a report."}
            </section>
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

function lastProjectActivity(walks: HubWalk[]) {
  if (walks.length === 0) return "none";
  return formatDate(walks[0]?.updatedAt ?? walks[0]?.createdAt ?? "");
}

function formatDate(value: string) {
  return value.slice(0, 10);
}
