"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";
import { ThermalImageGrid } from "@/components/ops/thermal/ThermalImageGrid";

type SlateFile = { id: string; file_name: string; file_size: number; file_type: string; previewUrl?: string | null };
type ProjectOption = { id: string; name: string };

/**
 * Import existing thermal images from a project's SlateDrop folders into a new
 * session — creates captures pointing at the existing R2 keys (no re-upload),
 * then kicks off extraction.
 */
export function ThermalSlateDropImport() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [files, setFiles] = useState<SlateFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ops/thermal/projects")
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((json) => setProjects((json?.data?.projects ?? json?.projects ?? []) as ProjectOption[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectId) {
      setFiles([]);
      setSelected(new Set());
      return;
    }
    setLoading(true);
    fetch(`/api/ops/thermal/slatedrop-images?projectId=${projectId}`)
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((json) => setFiles((json?.data?.files ?? json?.files ?? []) as SlateFile[]))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = files.length > 0 && selected.size === files.length;

  async function importSelected() {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const projectName = projects.find((p) => p.id === projectId)?.name ?? "Project";
      const sessionRes = await fetch("/api/ops/thermal/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${projectName} — SlateDrop import`, project_id: projectId }),
      });
      const sessionJson = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionJson.error ?? "Failed to create session");
      const sessionId = (sessionJson.data?.session ?? sessionJson.session ?? sessionJson.data ?? sessionJson).id;

      const importRes = await fetch(`/api/ops/thermal/sessions/${sessionId}/import-slatedrop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadIds: Array.from(selected) }),
      });
      const importJson = await importRes.json();
      if (!importRes.ok) throw new Error(importJson.error ?? "Import failed");

      await fetch("/api/ops/thermal/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, job_type: "extract" }),
      }).catch(() => {});

      router.push(`/thermal-studio/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setBusy(false);
    }
  }

  return (
    <div className={t.card}>
      <p className={t.eyebrow}>Import from SlateDrop</p>
      <p className="mt-2 text-xs text-[var(--graphite-muted)]">
        Pull thermal images you already filed in a project into a new session — no re-upload.
      </p>

      <div className="mt-3">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white sm:max-w-sm"
        >
          <option value="">Select a project…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {projectId ? (
        <div className="mt-3 h-72 rounded-xl border border-[var(--mobile-app-card-border)] p-2">
          {loading ? (
            <p className="p-3 text-xs text-[var(--graphite-muted)]">Loading images…</p>
          ) : (
            <ThermalImageGrid
              items={files.map((f) => ({ id: f.id, name: f.file_name, previewUrl: f.previewUrl }))}
              selected={selected}
              onToggle={toggle}
              onToggleAll={() => setSelected(allSelected ? new Set() : new Set(files.map((f) => f.id)))}
              emptyText="No image files in this project."
            />
          )}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          className={t.primaryButton}
          disabled={busy || selected.size === 0}
          onClick={importSelected}
        >
          {busy ? "Importing…" : `Import ${selected.size || ""} & decode`}
        </button>
        {error ? <span className="text-xs text-[#fca5a5]">{error}</span> : null}
      </div>
    </div>
  );
}
