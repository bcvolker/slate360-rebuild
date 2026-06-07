"use client";

import { useCallback, useState } from "react";
import { IconLoader2, IconPlus } from "@tabler/icons-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";

type Props = {
  projects: HubTwinProject[];
  onCreated: (space: HubTwin) => void;
  className?: string;
  /** When set, new workspaces attach to this project only. */
  lockedProjectId?: string;
};

export function CreateTwinSpaceForm({
  projects,
  onCreated,
  className,
  lockedProjectId,
}: Props) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(
    lockedProjectId ?? projects[0]?.id ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    const trimmed = title.trim();
    const effectiveProjectId = lockedProjectId ?? projectId;
    if (!trimmed || !effectiveProjectId) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/digital-twin/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed, project_id: effectiveProjectId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        space?: HubTwin;
        error?: string;
      };

      if (!res.ok || !data.space?.id) {
        throw new Error(data.error ?? "Could not create workspace");
      }

      onCreated(data.space);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }, [lockedProjectId, onCreated, projectId, title]);

  if (!projects.length) {
    return (
      <p className={cn("text-xs text-zinc-400", className)}>
        Create an active project first, then add a twin workspace here.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3",
        className,
      )}
    >
      <p className="mb-2 text-xs font-semibold text-zinc-300">Create twin workspace</p>

      {lockedProjectId ? (
        <p className="mb-2 text-xs text-zinc-400">
          Project:{" "}
          <span className="font-semibold text-zinc-200">
            {projects.find((row) => row.id === lockedProjectId)?.name ?? "Selected project"}
          </span>
        </p>
      ) : (
        <label className="mb-2 flex flex-col gap-1 text-xs text-zinc-400">
          Project
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100"
            disabled={busy}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="mb-3 flex flex-col gap-1 text-xs text-zinc-400">
        Workspace name
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Lobby — Level 1"
          className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100 placeholder:text-zinc-500"
          disabled={busy}
        />
      </label>

      <button
        type="button"
        onClick={() => void handleCreate()}
        disabled={busy || !title.trim() || !(lockedProjectId ?? projectId)}
        className={cn(twinAccent.button, "inline-flex w-full min-h-[44px] items-center justify-center gap-2")}
      >
        {busy ? (
          <IconLoader2 className={cn("h-4 w-4 animate-spin", twinAccent.spinner)} stroke={1.75} />
        ) : (
          <IconPlus className="h-4 w-4" stroke={1.75} />
        )}
        {busy ? "Creating…" : "Create workspace"}
      </button>

      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
