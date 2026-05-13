"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Building2, Camera, ClipboardList, FolderOpen, Loader2, Zap } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { PlanUploaderCard } from "@/components/site-walk/PlanUploaderCard";
import { WalkActionsMenu } from "./WalkActionsMenu";
import type { HubProject, HubSummary, HubWalk } from "./siteWalkHubTypes";

type CreateState = { kind: "idle" } | { kind: "starting"; target: string } | { kind: "error"; message: string };
type WorkTab = "active" | "recent" | "worksites" | "issues" | "reports";

export function SiteWalkHub({ projects, walks, summary }: { projects: HubProject[]; walks: HubWalk[]; summary: HubSummary }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkTab>(() => (walks.some((walk) => isActiveWalk(walk)) ? "active" : "recent"));
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(projects[0]?.id ?? null);
  const [createState, setCreateState] = useState<CreateState>({ kind: "idle" });
  const activeWalks = useMemo(() => walks.filter(isActiveWalk), [walks]);
  const recentWalks = useMemo(() => walks, [walks]);
  const issueCount = summary.openItems + summary.needsReview;
  const draftCount = summary.draftDeliverables + summary.unsyncedItems;

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
      <section className="shrink-0 rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-2 backdrop-blur-xl sm:p-3" aria-label="Site Walk actions">
        <p className="px-1 pb-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-amber-400/90">Site Walk</p>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <Link href="/site-walk/setup" className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.07] px-1.5 text-center text-[11px] font-black text-white transition hover:border-amber-400/45 hover:bg-white/[0.1] sm:gap-2 sm:px-2 sm:text-xs">
            <ClipboardList className="h-4 w-4 shrink-0 text-amber-300" /> New Worksite
          </Link>
          <button type="button" onClick={() => projects.length > 0 ? setActiveTab("worksites") : router.push("/site-walk/setup")} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.07] px-1.5 text-center text-[11px] font-black text-white transition hover:border-amber-400/45 hover:bg-white/[0.1] sm:gap-2 sm:px-2 sm:text-xs">
            <Building2 className="h-4 w-4 shrink-0 text-amber-300" /> Start Walk
          </button>
          <button type="button" onClick={() => void startWalk()} disabled={createState.kind === "starting"} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-amber-500 px-1.5 text-center text-[11px] font-black text-slate-950 transition hover:bg-amber-400 disabled:opacity-70 sm:gap-2 sm:px-2 sm:text-xs">
            {createState.kind === "starting" && createState.target === "quick" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Zap className="h-4 w-4 shrink-0" />} Quick Capture
          </button>
        </div>
      </section>

      {createState.kind === "error" && <p className="shrink-0 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200">{createState.message}</p>}

      <GlassCard className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="grid shrink-0 grid-cols-3 gap-1 border-b border-white/10 p-2 sm:grid-cols-5" role="tablist" aria-label="Site Walk command panels">
          {([
            { key: "active", label: "Active", count: activeWalks.length },
            { key: "recent", label: "Recent", count: walks.length },
            { key: "worksites", label: "Worksites", count: projects.length },
            { key: "issues", label: "Issues", count: issueCount },
            { key: "reports", label: "Reports", count: draftCount },
          ] as const).map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`min-h-8 rounded-xl px-2 text-[11px] font-black transition ${activeTab === tab.key ? "bg-amber-500 text-slate-950" : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"}`}>
              {tab.label}{tab.count > 0 ? <span className="ml-1 opacity-75">{tab.count}</span> : null}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[max(env(safe-area-inset-bottom),1rem)] no-scrollbar">
          {activeTab === "active" && (
            <section className="space-y-2">
              {activeWalks.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm font-bold text-slate-400">No active walks.</div>
              ) : (
                <div className="space-y-2">{activeWalks.map((walk) => renderWalkRow(walk, projects))}</div>
              )}
            </section>
          )}

          {activeTab === "recent" && (
            <section className="space-y-2">
              {recentWalks.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm font-bold text-slate-400">No walks yet.</div>
              ) : (
                <div className="space-y-2">
                  {recentWalks.map((walk) => renderWalkRow(walk, projects))}
                  <Link href="/site-walk/walks" className="block rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-xs font-black text-slate-200 hover:border-amber-400/45 hover:text-amber-200">Open full walks list</Link>
                </div>
              )}
            </section>
          )}

          {activeTab === "worksites" && (
            <section className="space-y-2">
              {projects.length === 0 ? (
                <Link href="/site-walk/setup" className="block rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm font-bold text-amber-200">No worksites yet. Create a worksite to organize walks, plans, captures, and deliverables.</Link>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => {
                    const projectWalks = walks.filter((walk) => walk.projectId === project.id);
                    const expanded = expandedProjectId === project.id;
                    return (
                      <div key={project.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
                        <button type="button" onClick={() => setExpandedProjectId(expanded ? null : project.id)} className="flex min-h-12 w-full items-center gap-3 text-left">
                          <FolderOpen className="h-5 w-5 shrink-0 text-amber-300" />
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-white">{project.name}</span><span className="block text-xs font-bold text-slate-400">{projectWalks.length} walk{projectWalks.length === 1 ? "" : "s"} · Last activity {lastProjectActivity(projectWalks)}</span></span>
                        </button>
                        {expanded && (
                          <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                            <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => void startWalk(project)} disabled={createState.kind === "starting"} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-amber-500 px-2 text-[11px] font-black text-slate-950 hover:bg-amber-400 disabled:opacity-70">
                              {createState.kind === "starting" && createState.target === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />} Start Walk
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
              {issueCount > 0 ? "Open items are tracked in saved walks. Open a walk to review them." : "No open issues yet."}
            </section>
          )}

          {activeTab === "reports" && (
            <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm font-bold text-slate-400">
              {draftCount > 0 ? <Link href="/site-walk/deliverables" className="text-amber-200 underline underline-offset-4">Open reports</Link> : "No reports yet. Complete a walk to create a deliverable."}
            </section>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function renderWalkRow(walk: HubWalk, projects: HubProject[]) {
  return (
    <div key={walk.id} className="flex items-center gap-2 rounded-3xl border border-white/10 bg-white/[0.04] p-2 transition hover:border-amber-400/40 hover:bg-white/[0.08]">
      <Link href={walkHref(walk)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300"><Camera className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-white">{walk.title}</span>
          <span className="mt-0.5 block truncate text-xs font-bold text-slate-400">{walk.projectName ?? "Quick Walk"} · {statusLabel(walk.status)} · {walk.itemCount} item{walk.itemCount === 1 ? "" : "s"} · {formatDate(walk.updatedAt)}</span>
        </span>
      </Link>
      <WalkActionsMenu walk={walk} projects={projects} />
    </div>
  );
}

function isActiveWalk(walk: HubWalk) {
  return walk.status === "in_progress" || walk.status === "draft";
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

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function formatDate(value: string) {
  return value.slice(0, 10);
}
