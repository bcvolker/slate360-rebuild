"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Play, Plus } from "lucide-react";
import type { SiteWalkSessionType } from "@/lib/types/site-walk";
import type { SetupProject } from "./setup-types";

type Props = {
  projects: SetupProject[];
};

type WalkTypeOption = {
  value: SiteWalkSessionType;
  label: string;
  description: string;
};

const WALK_TYPE_OPTIONS: WalkTypeOption[] = [
  { value: "punch",         label: "Punch List",        description: "Document incomplete or deficient items for correction" },
  { value: "progress",      label: "Progress Walk",     description: "Record current completion status across the site" },
  { value: "inspection",    label: "Inspection",        description: "Structured quality or compliance verification" },
  { value: "proposal",      label: "Proposal Walk",     description: "Capture site conditions for bid or scope development" },
  { value: "general",       label: "General Walk",      description: "Open-ended field documentation" },
  { value: "safety",        label: "Safety Inspection", description: "Identify and log safety hazards or violations" },
  { value: "proof_of_work", label: "Proof of Work",     description: "Photo documentation for invoicing or dispute resolution" },
];

function defaultTitle(walkType: SiteWalkSessionType, projectName?: string): string {
  const label = WALK_TYPE_OPTIONS.find((o) => o.value === walkType)?.label ?? "Site Walk";
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return projectName ? `${projectName} — ${label} — ${date}` : `${label} — ${date}`;
}

export function StartWalkForm({ projects }: Props) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [walkType, setWalkType] = useState<SiteWalkSessionType>("punch");
  const [title, setTitle] = useState(() => defaultTitle("punch", projects[0]?.name));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleWalkTypeChange(type: SiteWalkSessionType) {
    setWalkType(type);
    const project = projects.find((p) => p.id === projectId);
    setTitle(defaultTitle(type, project?.name));
  }

  function handleProjectChange(id: string) {
    setProjectId(id);
    const project = projects.find((p) => p.id === id);
    setTitle(defaultTitle(walkType, project?.name));
  }

  async function handleStartWalk() {
    if (!projectId) {
      setError("Select a field project to continue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/site-walk/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          session_type: walkType,
          title: title.trim() || defaultTitle(walkType),
          metadata: { started_at: new Date().toISOString(), started_from: "setup" },
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(typeof body.error === "string" ? body.error : `Server error ${res.status}`);
      }
      const body = (await res.json()) as { session?: { id: string } };
      const sessionId = body.session?.id;
      if (!sessionId) throw new Error("No session ID returned from server");
      router.push(`/site-walk/capture?session=${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start walk. Please try again.");
      setSubmitting(false);
    }
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Start a Walk</p>
        <h2 className="mt-2 text-xl font-black text-white">No field projects yet</h2>
        <p className="mt-2 text-sm text-slate-300">
          Create a field project first, then return here to launch a walk.
        </p>
        <a
          href="/dashboard?tab=projects&create=field"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> New Field Project
        </a>
      </div>
    );
  }

  const activeWalkType = WALK_TYPE_OPTIONS.find((o) => o.value === walkType);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Start a Walk</p>
      <h2 className="mt-2 text-xl font-black text-white">Configure and launch field capture</h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {/* Field Project */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-400">Field Project</label>
          <div className="relative">
            <select
              value={projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-8 text-sm text-white backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Walk Type */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-400">Walk Type</label>
          <div className="relative">
            <select
              value={walkType}
              onChange={(e) => handleWalkTypeChange(e.target.value as SiteWalkSessionType)}
              className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-8 text-sm text-white backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {WALK_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-slate-900">
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          {activeWalkType && (
            <p className="mt-1.5 text-xs text-slate-500">{activeWalkType.description}</p>
          )}
        </div>
      </div>

      {/* Session title */}
      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-bold text-slate-400">Walk Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Auto-generated from project and walk type"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={handleStartWalk}
          disabled={submitting || !projectId}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {submitting ? "Starting…" : "Start Walk"}
        </button>
        <a
          href="/dashboard?tab=projects&create=field"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-slate-200"
        >
          <Plus className="h-4 w-4" /> New Project
        </a>
      </div>
    </div>
  );
}
