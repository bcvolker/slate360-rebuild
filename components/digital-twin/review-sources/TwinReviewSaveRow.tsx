"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, FolderInput, Loader2 } from "lucide-react";
import { DigitalTwinProjectTargetSheet } from "@/components/digital-twin/DigitalTwinProjectTargetSheet";
import type { HubTwinProject } from "@/lib/types/digital-twin-hub";

/**
 * "Your scan is already in the cloud" row for the review screen.
 *
 * Two decisions a field user needs before (or instead of) processing:
 *   1. which project this scan belongs to — Quick Scans land in the pool
 *      project, so offer a one-tap move to a real job;
 *   2. saving for later — the upload is complete; nothing more is required,
 *      so this just says so and returns to My Twins.
 */
export function TwinReviewSaveRow({
  spaceId,
  projectId,
  disabled,
}: {
  spaceId: string | null;
  projectId: string | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<HubTwinProject[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((data: { projects?: Array<{ id: string; name: string; status?: string | null; created_at?: string }> }) => {
        if (cancelled) return;
        const rows = (data.projects ?? [])
          .filter((p) => (p.status ?? "active") === "active")
          .map((p) => ({ id: p.id, name: p.name, status: p.status ?? "active", createdAt: p.created_at ?? "" }));
        setProjects(rows);
        setProjectName(rows.find((p) => p.id === projectId)?.name ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const moveTo = useCallback(
    async (project: HubTwinProject) => {
      if (!spaceId) return;
      setMoving(true);
      setError(null);
      try {
        const res = await fetch(`/api/digital-twin/spaces/${encodeURIComponent(spaceId)}/project`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string; projectName?: string };
        if (!res.ok) throw new Error(json.error ?? "Could not move the scan");
        setProjectName(json.projectName ?? project.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not move the scan");
      } finally {
        setMoving(false);
      }
    },
    [spaceId],
  );

  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
      data-twin-review="save-row"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-[var(--twin360-blue)]">
          <CloudUpload className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--graphite-text-header)]">Saved to the cloud</p>
          <p className="truncate text-xs text-[var(--graphite-muted)]">
            {moving ? "Moving…" : projectName ? `Project · ${projectName}` : "Not in a project yet"}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || moving || !spaceId}
          onClick={() => setSheetOpen(true)}
          className="flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-semibold text-[var(--graphite-text-body)] hover:bg-white/[0.06] disabled:opacity-40"
        >
          {moving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FolderInput className="h-4 w-4" aria-hidden />}
          {projectName ? "Change" : "Choose project"}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => router.push("/digital-twin")}
        className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-[var(--graphite-text-body)] hover:bg-white/[0.06] disabled:opacity-40"
        data-twin-review-action="save-for-later"
      >
        Save for later · process another time
      </button>
      <DigitalTwinProjectTargetSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        projects={projects}
        onSelect={(project) => void moveTo(project)}
      />
    </section>
  );
}
