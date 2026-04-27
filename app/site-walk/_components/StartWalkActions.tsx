"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, HardHat, Loader2, Map, PlayCircle, X } from "lucide-react";

type ProjectOption = {
  id: string;
  name: string;
};

type Props = {
  projects: ProjectOption[];
  compact?: boolean;
  variant?: "hero" | "card";
};

type CardProps = {
  projects: ProjectOption[];
  mode: "ad-hoc" | "project";
  title: string;
  description: string;
  iconKey: "play" | "hardHat";
};

type SessionResponse = { session?: { id: string }; error?: string };

function createClientSessionId() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  return `site-walk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function StartWalkActions({ projects, compact = false, variant = "hero" }: Props) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [creating, setCreating] = useState<"ad-hoc" | "project" | null>(null);
  const [promptMode, setPromptMode] = useState<"ad-hoc" | "project" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedProject = useMemo(() => projects.find((project) => project.id === projectId) ?? null, [projectId, projects]);
  const buttonBase = variant === "hero"
    ? "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black"
    : "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black";

  async function startWalk(mode: "ad-hoc" | "project", routeMode: "plan" | "photos") {
    setCreating(mode);
    setError(null);
    try {
      const clientSessionId = createClientSessionId();
      const projectBound = mode === "project" && selectedProject;
      const response = await fetch("/api/site-walk/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectBound ? selectedProject.id : null,
          is_ad_hoc: !projectBound,
          client_session_id: clientSessionId,
          title: projectBound ? `${selectedProject.name} — Field Walk` : "Ad-hoc Site Walk",
          metadata: { source: "site_walk_dashboard", start_mode: projectBound ? "project" : "ad_hoc" },
          session_type: "general",
          sync_state: "synced",
        }),
      });
      const data = (await response.json().catch(() => null)) as SessionResponse | null;
      if (!response.ok || !data?.session?.id) throw new Error(data?.error ?? "Could not start walk");
      const encodedSession = encodeURIComponent(data.session.id);
      router.push(routeMode === "plan" ? `/site-walk/plans?session=${encodedSession}` : `/site-walk/capture?session=${encodedSession}&plan=skip`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not start walk");
    } finally {
      setCreating(null);
      setPromptMode(null);
    }
  }

  if (compact) {
    return (
      <>
        <button type="button" onClick={() => setPromptMode("ad-hoc")} disabled={!!creating} className={`${buttonBase} bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-60`}>
          {creating === "ad-hoc" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Start Walk <ArrowRight className="h-4 w-4" />
        </button>
        <StartWalkPlanModal open={!!promptMode} creating={creating} onClose={() => setPromptMode(null)} onSelectPlan={() => void startWalk(promptMode ?? "ad-hoc", "plan")} onPhotosOnly={() => void startWalk(promptMode ?? "ad-hoc", "photos")} />
      </>
    );
  }

  return (
    <div className="space-y-3 rounded-3xl border border-slate-300 bg-white p-4">
      <label className="block text-sm font-bold text-slate-900">
        <span className="mb-1 block">Project-bound walk</span>
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15">
          {projects.length === 0 && <option value="">No projects yet</option>}
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => setPromptMode("ad-hoc")} disabled={!!creating} className={`${buttonBase} border border-slate-300 bg-white text-slate-900 transition hover:border-blue-300 hover:text-blue-800 disabled:opacity-60`}>Start Walk Now</button>
        <button type="button" onClick={() => setPromptMode("project")} disabled={!!creating || !selectedProject} className={`${buttonBase} bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-60`}>{creating === "project" ? "Creating…" : "Start Project Walk"}</button>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
        <span>Ad-hoc starts immediately. Project-bound carries the selected project context.</span>
        <Link href="/site-walk/setup" className="text-blue-700 hover:underline">Setup</Link>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
      <StartWalkPlanModal open={!!promptMode} creating={creating} onClose={() => setPromptMode(null)} onSelectPlan={() => void startWalk(promptMode ?? "ad-hoc", "plan")} onPhotosOnly={() => void startWalk(promptMode ?? "ad-hoc", "photos")} />
    </div>
  );
}

export function StartWalkCardButton({ projects, mode, title, description, iconKey }: CardProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const project = projects[0] ?? null;
  const Icon = iconKey === "hardHat" ? HardHat : PlayCircle;

  async function startWalk(routeMode: "plan" | "photos") {
    setCreating(true);
    setError(null);
    try {
      const projectBound = mode === "project" && project;
      const response = await fetch("/api/site-walk/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectBound ? project.id : null,
          is_ad_hoc: !projectBound,
          client_session_id: createClientSessionId(),
          title: projectBound ? `${project.name} — Field Walk` : "Ad-hoc Site Walk",
          metadata: { source: "site_walk_dashboard_card", start_mode: projectBound ? "project" : "ad_hoc" },
          session_type: "general",
          sync_state: "synced",
        }),
      });
      const data = (await response.json().catch(() => null)) as SessionResponse | null;
      if (!response.ok || !data?.session?.id) throw new Error(data?.error ?? "Could not start walk");
      const encodedSession = encodeURIComponent(data.session.id);
      router.push(routeMode === "plan" ? `/site-walk/plans?session=${encodedSession}` : `/site-walk/capture?session=${encodedSession}&plan=skip`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not start walk");
      setCreating(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setPromptOpen(true)} disabled={creating || (mode === "project" && !project)} className="group rounded-2xl border border-slate-300 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-60">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-800">
            {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1"><h3 className="font-black text-slate-950">{creating ? "Creating session…" : title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{error ?? description}</p></div>
          <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" />
        </div>
      </button>
      <StartWalkPlanModal open={promptOpen} creating={creating ? mode : null} onClose={() => setPromptOpen(false)} onSelectPlan={() => void startWalk("plan")} onPhotosOnly={() => void startWalk("photos")} />
    </>
  );
}

function StartWalkPlanModal({ open, creating, onClose, onSelectPlan, onPhotosOnly }: {
  open: boolean;
  creating: "ad-hoc" | "project" | null;
  onClose: () => void;
  onSelectPlan: () => void;
  onPhotosOnly: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-300 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Start Walk</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Attach a Floor Plan?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Most field walks are photos only. You can add a plan now or skip straight to capture.</p>
          </div>
          <button type="button" onClick={onClose} disabled={!!creating} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close start walk modal"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onSelectPlan} disabled={!!creating} className="min-h-32 rounded-3xl border-2 border-blue-200 bg-blue-50 p-5 text-left transition hover:border-blue-400 disabled:opacity-60">
            <Map className="h-8 w-8 text-blue-800" />
            <span className="mt-4 block text-xl font-black text-slate-950">Select Plan</span>
            <span className="mt-1 block text-sm font-bold text-slate-600">Choose a floor plan before capture.</span>
          </button>
          <button type="button" onClick={onPhotosOnly} disabled={!!creating} className="min-h-32 rounded-3xl bg-blue-600 p-5 text-left text-white transition hover:bg-blue-700 disabled:opacity-60">
            {creating ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-8 w-8" />}
            <span className="mt-4 block text-xl font-black">Skip - Photos Only</span>
            <span className="mt-1 block text-sm font-bold text-blue-50">Go straight to camera/upload.</span>
          </button>
        </div>
      </div>
    </div>
  );
}
