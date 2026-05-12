"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { ProjectSavedEvent, SetupProject, SiteWalkSetupTier, SubmitState } from "./setup-types";

type ProjectResponse = { project?: SetupProject; error?: string };
type ProjectsResponse = { projects?: SetupProject[]; error?: string };

type ProjectForm = {
  projectId: string;
  name: string;
  description: string;
  location: string;
  address: string;
  scope: string;
  startDate: string;
  endDate: string;
};

type Props = {
  initialProjects: SetupProject[];
  tier: SiteWalkSetupTier;
  onProjectSaved: (event: ProjectSavedEvent) => void;
};

const inputClass = "w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20";

export function ProjectSetupForm({ initialProjects, tier, onProjectSaved }: Props) {
  const [projects, setProjects] = useState(initialProjects);
  const [status, setStatus] = useState<SubmitState>({ kind: "idle" });
  const [form, setForm] = useState<ProjectForm>(() => emptyForm(initialProjects[0]));
  const expanded = tier !== "basic";

  const selected = useMemo(() => projects.find((project) => project.id === form.projectId) ?? null, [projects, form.projectId]);

  function chooseProject(projectId: string) {
    const next = projects.find((project) => project.id === projectId);
    setForm(emptyForm(next));
    if (next) onProjectSaved({ project: next });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return setStatus({ kind: "error", message: "Project name is required." });
    setStatus({ kind: "loading", message: "Saving site visit…" });
    try {
      const metadata = buildMetadata(form, selected?.metadata ?? null, expanded);
      const payload = { name: form.name, description: form.description, metadata };
      const endpoint = form.projectId ? `/api/projects/${form.projectId}` : "/api/projects/create";
      const save = await fetch(endpoint, {
        method: form.projectId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!save.ok) throw new Error(await readError(save));
      const saved = (await save.json()) as ProjectResponse;
      const projectId = saved.project?.id ?? form.projectId;
      if (!projectId) throw new Error("Project save did not return an id.");

      const readback = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
      if (!readback.ok) throw new Error(await readError(readback));
      const data = (await readback.json()) as ProjectResponse;
      if (!data.project) throw new Error("Project readback failed.");

      setForm(emptyForm(data.project));
      await refreshProjects(data.project.id);
      onProjectSaved({ project: data.project });
      setStatus({ kind: "ok", message: "Project setup saved and read back from the database." });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Could not save project." });
    }
  }

  async function refreshProjects(activeId: string) {
    const response = await fetch("/api/projects", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as ProjectsResponse;
    const next = data.projects ?? [];
    setProjects(next);
    const active = next.find((project) => project.id === activeId);
    if (active) setForm(emptyForm(active));
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-md p-5">
      <Header expanded={expanded} loading={status.kind === "loading"} />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-bold text-slate-900 md:col-span-2">
          <span className="mb-1 block">Project context</span>
          <select value={form.projectId} onChange={(e) => chooseProject(e.target.value)} className={inputClass}>
            <option value="">Create a new site visit</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <Field label="Project name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tower A punch walk" /></Field>
        <Field label="Location label"><input className={inputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Downtown Austin" /></Field>
        <Field label="Address"><input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" /></Field>
        <Field label="Scope"><input className={inputClass} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="Drywall QA walk" /></Field>
        {expanded && <Field label="Start date"><input className={inputClass} type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>}
        {expanded && <Field label="Target completion"><input className={inputClass} type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>}
        <div className="md:col-span-2"><Field label="Description"><textarea className={`${inputClass} min-h-20`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Notes for the field team" /></Field></div>
      </div>
      <StatusMessage status={status} />
    </form>
  );
}

function Header({ expanded, loading }: { expanded: boolean; loading: boolean }) {
  return <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">Project setup</p><h2 className="mt-1 text-xl font-black text-slate-50">{expanded ? "CM-ready project context" : "Fast site visit"}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{expanded ? "Capture schedule-aware context and project hooks for Pro/Business workflows." : "Basic users get a lightweight setup that gets crews into capture fast."}</p></div><button type="submit" disabled={loading} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-sm transition hover:bg-amber-400 disabled:opacity-60">{loading ? "Saving…" : "Save project"}</button></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-bold text-slate-200"><span className="mb-1 block">{label}</span>{children}</label>; }
function StatusMessage({ status }: { status: SubmitState }) { if (status.kind === "idle" || status.kind === "loading") return null; return <p className={`mt-4 text-sm font-semibold ${status.kind === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{status.message}</p>; }
function textMeta(metadata: Record<string, unknown> | null | undefined, key: string) { const value = metadata?.[key]; return typeof value === "string" ? value : ""; }
function emptyForm(project?: SetupProject): ProjectForm { return { projectId: project?.id ?? "", name: project?.name ?? "", description: project?.description ?? "", location: textMeta(project?.metadata, "location"), address: textMeta(project?.metadata, "address"), scope: textMeta(project?.metadata, "scope"), startDate: textMeta(project?.metadata, "start_date"), endDate: textMeta(project?.metadata, "end_date") }; }
function buildMetadata(form: ProjectForm, current: Record<string, unknown> | null, expanded: boolean) { return { ...(current ?? {}), app: "site_walk", location: form.location, address: form.address, scope: form.scope, ...(expanded ? { start_date: form.startDate || null, end_date: form.endDate || null, cm_hooks_enabled: true } : { cm_hooks_enabled: false }) }; }
async function readError(response: Response) { const data = (await response.json().catch(() => null)) as { error?: string } | null; return data?.error ?? "Request failed"; }
