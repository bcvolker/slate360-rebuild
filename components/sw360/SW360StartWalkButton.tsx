"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { startProjectWalk, quickCreateProject, StartWalkError } from "@/lib/site-walk/start-walk";

type Project = { id: string; name: string };

/**
 * Real "Start a walk" action. One project (also always true on the project
 * detail page, which passes a single-item array): starts immediately. Zero:
 * quick-create-and-go, since there's nothing to be ambiguous about yet.
 * Multiple: routes to Projects instead of popping an inline "which project?"
 * picker here — Brian's feedback was that a generic Home button asking you
 * to pick a project isn't intuitive; going TO the project and starting the
 * walk FROM there is. lib/site-walk/start-walk.ts is shared, proven
 * plumbing (same helpers the legacy home's "Walk from project" door uses).
 * Lands in the existing capture-v2 engine; B2.5 reskins its chrome.
 */
export function SW360StartWalkButton({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
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

  function handleStart() {
    if (projects.length === 1) {
      void goToCapture(projects[0].id, projects[0].name);
      return;
    }
    if (projects.length === 0) {
      setCreating(true);
      return;
    }
    router.push("/sw360/projects");
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

  if (creating) {
    return (
      <form
        onSubmit={handleQuickCreate}
        className="rounded-2xl border border-[var(--border)] bg-white/70 p-4"
      >
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/70">
          Name your first project
        </p>
        {error ? <p className="mb-2 text-xs font-semibold text-[var(--sw360-destructive)]">{error}</p> : null}
        <div className="flex gap-2">
          <input
            autoFocus
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="e.g. ASU AOB 205"
            className="min-h-[44px] flex-1 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]"
          />
          <button
            type="submit"
            disabled={busy || !newProjectName.trim()}
            className="flex min-h-[44px] items-center rounded-lg bg-[var(--sw360-green-light)] px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : "Go"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleStart}
      className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sw360-green-light)] text-base font-bold text-white disabled:opacity-60"
    >
      {busy ? <Loader2 size={18} className="animate-spin" /> : null}
      {projects.length === 1 ? `Start a walk in ${projects[0].name}` : "Start a walk"}
    </button>
  );
}
