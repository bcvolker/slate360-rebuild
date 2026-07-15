"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  startProjectWalk,
  startQuickWalk,
  quickCreateProject,
  StartWalkError,
} from "@/lib/site-walk/start-walk";

type Project = { id: string; name: string };

/**
 * Two distinct, honestly-labeled actions (Brian: a single ambiguous "Start a
 * walk" button wasn't intuitive, and there was no way to just start
 * capturing without a project at all):
 *
 * - Quick walk (showQuickWalk=true, Home only): starts capturing immediately,
 *   no project required (an ad-hoc session — assigning it to a project later
 *   is separate future work). Always shown first/primary on Home.
 * - Start a walk in a project: one project (also always true on the project
 *   detail page, which passes a single-item array) starts immediately and
 *   names the project; zero quick-creates one; multiple routes to Projects
 *   (starting a walk FROM a project you navigated to is the intuitive path,
 *   not an on-page picker).
 *
 * lib/site-walk/start-walk.ts is shared, proven plumbing. Lands in the
 * existing capture-v2 engine; B2.5 reskins its chrome.
 */
export function SW360StartWalkButton({
  projects,
  showQuickWalk = false,
}: {
  projects: Project[];
  showQuickWalk?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  async function goTo(url: string) {
    setBusy(true);
    setError(null);
    try {
      router.push(url);
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickWalk() {
    setBusy(true);
    setError(null);
    try {
      const url = await startQuickWalk();
      router.push(url);
    } catch (e) {
      setError(e instanceof StartWalkError ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

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

  function handleStartInProject() {
    if (projects.length === 1) {
      void goToCapture(projects[0].id, projects[0].name);
      return;
    }
    if (projects.length === 0) {
      setCreating(true);
      return;
    }
    void goTo("/sw360/projects");
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
    <div className="flex flex-col gap-2">
      {error ? <p className="text-xs font-semibold text-[var(--sw360-destructive)]">{error}</p> : null}
      <div className={showQuickWalk ? "flex gap-2" : "flex flex-col gap-2"}>
        {showQuickWalk ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleQuickWalk()}
            className="flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--sw360-green-light)] px-2 text-center text-sm font-bold leading-tight text-white disabled:opacity-60"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : null}
            Quick walk
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={handleStartInProject}
          className={
            showQuickWalk
              ? "flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--sw360-charcoal)] px-2 text-center text-sm font-bold leading-tight text-white disabled:opacity-60"
              : "flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sw360-green-light)] text-base font-bold text-white disabled:opacity-60"
          }
        >
          {projects.length === 1 ? `Walk in ${projects[0].name}` : "Start a walk in a project"}
        </button>
      </div>
    </div>
  );
}
