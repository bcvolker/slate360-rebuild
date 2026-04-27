"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

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
  icon: ComponentType<{ className?: string }>;
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
  const [error, setError] = useState<string | null>(null);

  const selectedProject = useMemo(() => projects.find((project) => project.id === projectId) ?? null, [projectId, projects]);
  const buttonBase = variant === "hero"
    ? "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black"
    : "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black";

  async function startWalk(mode: "ad-hoc" | "project") {
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
      router.push(`/site-walk/capture?session=${encodeURIComponent(data.session.id)}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not start walk");
    } finally {
      setCreating(null);
    }
  }

  if (compact) {
    return (
      <button type="button" onClick={() => void startWalk("ad-hoc")} disabled={!!creating} className={`${buttonBase} bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-60`}>
        {creating === "ad-hoc" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Start Walk <ArrowRight className="h-4 w-4" />
      </button>
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
        <button type="button" onClick={() => void startWalk("ad-hoc")} disabled={!!creating} className={`${buttonBase} border border-slate-300 bg-white text-slate-900 transition hover:border-blue-300 hover:text-blue-800 disabled:opacity-60`}>Start Walk Now</button>
        <button type="button" onClick={() => void startWalk("project")} disabled={!!creating || !selectedProject} className={`${buttonBase} bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-60`}>{creating === "project" ? "Creating…" : "Create Field Project"}</button>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
        <span>Ad-hoc starts immediately. Project-bound carries the selected project context.</span>
        <Link href="/site-walk/setup" className="text-blue-700 hover:underline">Setup</Link>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
    </div>
  );
}

export function StartWalkCardButton({ projects, mode, title, description, icon: Icon }: CardProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const project = projects[0] ?? null;

  async function startWalk() {
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
      router.push(`/site-walk/capture?session=${encodeURIComponent(data.session.id)}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not start walk");
      setCreating(false);
    }
  }

  return (
    <button type="button" onClick={() => void startWalk()} disabled={creating || (mode === "project" && !project)} className="group rounded-2xl border border-slate-300 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-60">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-800">
          {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1"><h3 className="font-black text-slate-950">{creating ? "Creating session…" : title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{error ?? description}</p></div>
        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" />
      </div>
    </button>
  );
}
