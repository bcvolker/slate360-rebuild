"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { startProjectWalk, quickCreateProject, StartWalkError } from "@/lib/site-walk/start-walk";

type Project = { id: string; name: string };

/**
 * Real "Start a walk" action — not a stub. One project: starts immediately.
 * Multiple: inline picker. None: quick-creates one from a name, same as the
 * legacy Site Walk home's "Walk from project" door (lib/site-walk/start-walk.ts
 * is shared, proven plumbing — reused, not rebuilt). Lands in the existing
 * capture-v2 engine; B2.5 reskins its chrome to the SW360 brand.
 */
export function SW360StartWalkButton({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  async function goToCapture(projectId: string, projectName: string) {
    setBusy(true);
    setError(null);
    try {
      const url = await startProjectWalk(projectId, projectName, "sw360_home");
      router.push(url);
    } catch (e) {
      setError(e instanceof StartWalkError ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  async function handleStart() {
    if (projects.length === 1) {
      await goToCapture(projects[0].id, projects[0].name);
      return;
    }
    setPickerOpen(true);
  }

  async function handleQuickCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const project = await quickCreateProject(newProjectName);
      await goToCapture(project.id, project.name);
    } catch (e2) {
      setError(e2 instanceof StartWalkError ? e2.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  if (pickerOpen) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/70">
          Which project?
        </p>
        {error ? <p className="mb-2 text-xs font-semibold text-[var(--sw360-destructive)]">{error}</p> : null}
        <div className="flex flex-col gap-2">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => void goToCapture(p.id, p.name)}
              className="flex min-h-[48px] items-center rounded-lg border border-[var(--border)] bg-white px-3 text-left text-sm font-semibold text-[var(--sw360-charcoal)] disabled:opacity-60"
            >
              {p.name}
            </button>
          ))}
        </div>
        <form onSubmit={handleQuickCreate} className="mt-3 flex gap-2">
          <input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Or start a new project…"
            className="min-h-[44px] flex-1 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]"
          />
          <button
            type="submit"
            disabled={busy || !newProjectName.trim()}
            className="flex min-h-[44px] items-center rounded-lg bg-[var(--sw360-green-light)] px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : "Go"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-5">
      <p className="text-sm font-bold text-[var(--sw360-charcoal)]">Start a walk</p>
      <p className="mt-1 text-xs text-[var(--sw360-charcoal)]/60">
        {projects.length === 0
          ? "Name a project and go."
          : projects.length === 1
            ? `In ${projects[0].name}`
            : "Pick a project or start a new one."}
      </p>
      {error ? <p className="mt-2 text-xs font-semibold text-[var(--sw360-destructive)]">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleStart()}
        className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--sw360-green-light)] text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : null}
        Start a walk
      </button>
    </div>
  );
}
