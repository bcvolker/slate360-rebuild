"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SlateFile = { id: string; file_name: string; folder_id: string; folder_name: string; previewUrl?: string | null };
type FolderOption = { id: string; name: string; count: number };
type ProjectOption = { id: string; name: string };

/**
 * Left-rail file management for the workbench: drag-drop / browse upload straight
 * into the current session, plus an inline SlateDrop folder tree to pull images you
 * already filed (project → folder → multi-select → import) without leaving Inspect.
 */
export function ThermalFilesRail({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  // SlateDrop tree
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [files, setFiles] = useState<SlateFile[]>([]);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetch("/api/ops/thermal/projects")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setProjects((j?.data?.projects ?? j?.projects ?? []) as ProjectOption[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectId) { setFiles([]); setFolders([]); setOpenFolder(null); return; }
    setLoading(true);
    fetch(`/api/ops/thermal/slatedrop-images?projectId=${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        setFiles((j?.data?.files ?? j?.files ?? []) as SlateFile[]);
        setFolders((j?.data?.folders ?? j?.folders ?? []) as FolderOption[]);
        setOpenFolder(null);
        setSelected(new Set());
      })
      .catch(() => { setFiles([]); setFolders([]); })
      .finally(() => setLoading(false));
  }, [projectId]);

  const folderFiles = useMemo(
    () => (openFolder ? files.filter((f) => f.folder_id === openFolder) : []),
    [files, openFolder],
  );

  // --- Upload straight into the current session (presign → PUT → finalize) ---
  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const arr = Array.from(fileList).filter((f) => /image|\.(jpe?g|tiff?|png)$/i.test(f.type || f.name));
      if (!arr.length) return;
      setUploadErr(null);
      setUploading({ done: 0, total: arr.length });
      try {
        for (let i = 0; i < arr.length; i++) {
          const file = arr[i];
          const presign = await fetch("/api/ops/thermal/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phase: "presign", sessionId, filename: file.name, contentType: file.type || "application/octet-stream", sizeBytes: file.size }),
          }).then((r) => r.json());
          if (!presign.signedUrl) throw new Error(presign.error ?? "Presign failed");
          const put = await fetch(presign.signedUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
          if (!put.ok) throw new Error(`Upload failed (${put.status})`);
          await fetch("/api/ops/thermal/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phase: "finalize", captureId: presign.captureId, storagePath: presign.storagePath, sizeBytes: file.size }),
          });
          setUploading({ done: i + 1, total: arr.length });
        }
        // Decode the freshly-uploaded captures, then refresh the session.
        await fetch("/api/ops/thermal/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, job_type: "extract" }),
        }).catch(() => {});
        router.refresh();
      } catch (err) {
        setUploadErr(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setTimeout(() => setUploading(null), 1500);
      }
    },
    [sessionId, router],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function importSelected() {
    if (!selected.size) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/ops/thermal/sessions/${sessionId}/import-slatedrop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadIds: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      const captureIds: string[] = json.data?.captureIds ?? json.captureIds ?? [];
      await fetch("/api/ops/thermal/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, job_type: "extract", capture_ids: captureIds }),
      }).catch(() => {});
      setSelected(new Set());
      router.refresh();
    } catch {
      /* surfaced via disabled state; keep the rail simple */
    } finally {
      setImporting(false);
    }
  }

  const eyebrow = "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--graphite-muted)]";

  return (
    <div className="space-y-3">
      {/* Upload drop zone */}
      <div>
        <span className={eyebrow}>Add images</span>
        <label
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files); }}
          className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-2 py-4 text-center text-[10px] transition-colors ${
            dragActive
              ? "border-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-text-header)]"
              : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
          }`}
        >
          <span aria-hidden className="text-base">⤓</span>
          <span>Drop thermal images<br />or click to browse</span>
          <input type="file" accept="image/*,.jpg,.jpeg,.tif,.tiff" multiple className="hidden" onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
        </label>
        {uploading ? (
          <p className="mt-1 text-[10px] text-[var(--graphite-muted)]">Uploading {uploading.done}/{uploading.total}…</p>
        ) : null}
        {uploadErr ? <p className="mt-1 text-[10px] text-[#fca5a5]">{uploadErr}</p> : null}
      </div>

      {/* SlateDrop tree */}
      <div className="border-t border-[var(--mobile-app-card-border)] pt-2">
        <span className={eyebrow}>SlateDrop</span>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mt-1.5 block w-full rounded-lg border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas-deep)] px-2 py-1 text-xs text-[var(--graphite-text-body)] [color-scheme:dark]"
        >
          <option value="">Select a project…</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {loading ? (
          <p className="mt-2 text-[10px] text-[var(--graphite-muted)]">Loading folders…</p>
        ) : projectId && folders.length === 0 ? (
          <p className="mt-2 text-[10px] text-[var(--graphite-muted)]">No image folders in this project.</p>
        ) : (
          <ul className="mt-1.5 space-y-0.5">
            {folders.map((f) => {
              const open = openFolder === f.id;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setOpenFolder(open ? null : f.id)}
                    className={`flex w-full items-center justify-between gap-1 rounded px-1.5 py-1 text-left text-[11px] ${
                      open ? "bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]" : "text-[var(--graphite-text-body)] hover:text-[var(--graphite-text-header)]"
                    }`}
                  >
                    <span className="truncate">{open ? "▾" : "▸"} {f.name}</span>
                    <span className="shrink-0 tabular-nums opacity-60">{f.count}</span>
                  </button>
                  {open ? (
                    <div className="mb-1 mt-1 grid grid-cols-2 gap-1 pl-2">
                      {folderFiles.map((file) => {
                        const on = selected.has(file.id);
                        return (
                          <button
                            key={file.id}
                            type="button"
                            onClick={() => toggle(file.id)}
                            title={file.file_name}
                            className={`relative aspect-[4/3] overflow-hidden rounded border bg-[#111827] ${
                              on ? "border-[var(--graphite-primary)] ring-1 ring-[var(--graphite-primary)]" : "border-[var(--mobile-app-card-border)]"
                            }`}
                          >
                            {file.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={file.previewUrl} alt={file.file_name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full items-center justify-center px-0.5 text-center text-[7px] text-[var(--graphite-muted)]">{file.file_name}</span>
                            )}
                            {on ? (
                              <span className="absolute right-0.5 top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--graphite-primary)] text-[8px] font-bold text-[var(--graphite-canvas)]">✓</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {selected.size ? (
          <button
            type="button"
            onClick={importSelected}
            disabled={importing}
            className="mt-2 block w-full rounded-lg bg-[var(--graphite-primary)] px-2 py-1.5 text-[11px] font-semibold text-[var(--graphite-canvas)] disabled:opacity-50"
          >
            {importing ? "Importing…" : `Import ${selected.size} into analysis`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
