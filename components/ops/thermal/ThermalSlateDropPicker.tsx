"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ThermalImageGrid } from "@/components/ops/thermal/ThermalImageGrid";

type SlateFile = {
  id: string;
  file_name: string;
  file_type: string;
  folder_id: string;
  folder_name: string;
  previewUrl?: string | null;
};
type FolderOption = { id: string; name: string; count: number };
type ProjectOption = { id: string; name: string };

/**
 * Full-screen pop-out to browse a project's SlateDrop folders and multi-select many
 * images to bring into analysis. Imports into the CURRENT session (no re-upload) and
 * kicks off extraction. Designed for picking large batches comfortably.
 */
export function ThermalSlateDropPicker({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [files, setFiles] = useState<SlateFile[]>([]);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ops/thermal/projects")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setProjects((j?.data?.projects ?? j?.projects ?? []) as ProjectOption[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectId) { setFiles([]); setFolders([]); setActiveFolder("all"); return; }
    setLoading(true);
    fetch(`/api/ops/thermal/slatedrop-images?projectId=${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        setFiles((j?.data?.files ?? j?.files ?? []) as SlateFile[]);
        setFolders((j?.data?.folders ?? j?.folders ?? []) as FolderOption[]);
        setActiveFolder("all");
        setSelected(new Set());
      })
      .catch(() => { setFiles([]); setFolders([]); })
      .finally(() => setLoading(false));
  }, [projectId]);

  const visible = useMemo(
    () => (activeFolder === "all" ? files : files.filter((f) => f.folder_id === activeFolder)),
    [files, activeFolder],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    const visIds = visible.map((f) => f.id);
    const allVisSelected = visIds.length > 0 && visIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisSelected) visIds.forEach((id) => next.delete(id));
      else visIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function importSelected() {
    if (!selected.size) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/thermal/sessions/${sessionId}/import-slatedrop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadIds: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      const captureIds: string[] = json.data?.captureIds ?? json.captureIds ?? [];
      // Decode the freshly-imported captures.
      await fetch("/api/ops/thermal/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, job_type: "extract", capture_ids: captureIds }),
      }).catch(() => {});
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setBusy(false);
    }
  }

  const folderBtn = (id: string, name: string, count: number) => {
    const active = activeFolder === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setActiveFolder(id)}
        className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
          active
            ? "border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]"
            : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        }`}
      >
        <span className="truncate">{name}</span>
        <span className="ml-2 shrink-0 tabular-nums opacity-70">{count}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[88vh] w-full max-w-6xl flex-col rounded-2xl border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)] p-4">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--graphite-text-header)]">Import from SlateDrop</p>
            <p className="text-[11px] text-[var(--graphite-muted)]">Browse folders and select images to bring into this analysis — no re-upload.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--mobile-app-card-border)] px-2.5 py-1 text-xs text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">
            Close ✕
          </button>
        </div>

        <div className="mt-3">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white sm:max-w-sm"
          >
            <option value="">Select a project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Body: folders | grid */}
        <div className="mt-3 grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)] gap-3">
          <aside className="min-h-0 space-y-1.5 overflow-y-auto rounded-xl border border-[var(--mobile-app-card-border)] p-2">
            <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Folders</p>
            {folderBtn("all", "All folders", files.length)}
            {folders.map((f) => folderBtn(f.id, f.name, f.count))}
          </aside>

          <div className="min-h-0 rounded-xl border border-[var(--mobile-app-card-border)] p-2">
            {!projectId ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--graphite-muted)]">Select a project to browse its folders.</div>
            ) : loading ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--graphite-muted)]">Loading images…</div>
            ) : (
              <ThermalImageGrid
                items={visible.map((f) => ({ id: f.id, name: f.file_name, previewUrl: f.previewUrl }))}
                selected={selected}
                onToggle={toggle}
                onToggleAll={toggleAll}
                emptyText="No images in this folder."
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 flex shrink-0 items-center justify-between gap-3">
          <span className="text-xs text-[var(--graphite-muted)]">{selected.size} selected</span>
          <div className="flex items-center gap-3">
            {error ? <span className="text-xs text-[#fca5a5]">{error}</span> : null}
            <button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={importSelected}
              className="rounded-lg bg-[var(--graphite-primary)] px-4 py-2 text-sm font-semibold text-[var(--graphite-canvas)] disabled:opacity-40"
            >
              {busy ? "Importing…" : `Bring ${selected.size || ""} into analysis`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
