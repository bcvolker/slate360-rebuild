"use client";

import { useEffect, useState } from "react";
import {
  importSlateDropUploads,
  listSlateDropImages,
  listThermalProjects,
  type SlateDropFolder,
  type SlateDropImageFile,
  type SlateDropProject,
} from "@/components/thermal-studio-v2/lib/api";

/** Project → folder → expand picker (doc §1, Tab 1 left rail). */
export function SlateDropImportModal({
  sessionId,
  onClose,
  onImported,
}: {
  sessionId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [projects, setProjects] = useState<SlateDropProject[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [folders, setFolders] = useState<SlateDropFolder[]>([]);
  const [files, setFiles] = useState<SlateDropImageFile[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void listThermalProjects().then(setProjects);
  }, []);

  useEffect(() => {
    if (!projectId) {
      setFolders([]);
      setFiles([]);
      return;
    }
    setLoading(true);
    void listSlateDropImages(projectId).then(({ files, folders }) => {
      setFiles(files);
      setFolders(folders);
      setExpanded(new Set(folders.map((f) => f.id)));
      setLoading(false);
    });
  }, [projectId]);

  function toggleFolder(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleFile(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function confirmImport() {
    setStatus("Importing…");
    const result = await importSlateDropUploads(sessionId, Array.from(picked));
    setStatus(result.message);
    if (result.ok) {
      onImported();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--mobile-app-card-border)] px-4 py-2.5">
          <span className="text-sm font-semibold text-[var(--graphite-text-header)]">Import from SlateDrop</span>
          <button type="button" onClick={onClose} aria-label="Close" title="Close" className="text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">
            ✕
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--mobile-app-card-border)] px-4 py-2">
          <label className="text-xs text-[var(--graphite-muted)]">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-xs text-[var(--graphite-text-header)]"
          >
            <option value="">Choose a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? <div className="text-xs text-[var(--graphite-muted)]">Loading…</div> : null}
          {!loading && projectId && !folders.length ? (
            <div className="text-xs text-[var(--graphite-muted)]">No images found in this project's folders.</div>
          ) : null}
          {folders.map((folder) => {
            const folderFiles = files.filter((f) => f.folder_id === folder.id);
            const open = expanded.has(folder.id);
            return (
              <div key={folder.id} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleFolder(folder.id)}
                  className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs font-medium text-[var(--graphite-text-header)] hover:bg-[color-mix(in_srgb,var(--graphite-text-header)_6%,transparent)]"
                >
                  <span>{open ? "▾" : "▸"}</span>
                  {folder.name} ({folder.count})
                </button>
                {open ? (
                  <div className="ml-4 grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-1.5 py-1">
                    {folderFiles.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFile(f.id)}
                        title={f.file_name}
                        className={`flex aspect-square flex-col overflow-hidden rounded border text-left ${
                          picked.has(f.id) ? "border-[var(--graphite-primary)] ring-1 ring-[var(--graphite-primary)]" : "border-[var(--mobile-app-card-border)]"
                        }`}
                      >
                        {f.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.previewUrl} alt={f.file_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[var(--graphite-canvas-deep)] p-1 text-center text-[9px] text-[var(--graphite-muted)]">
                            {f.file_name}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-[var(--mobile-app-card-border)] px-4 py-2.5">
          <span className="text-xs text-[var(--graphite-muted)]">
            {status ?? `${picked.size} selected`}
          </span>
          <button
            type="button"
            disabled={!picked.size}
            onClick={() => void confirmImport()}
            className="rounded-md bg-[color-mix(in_srgb,var(--graphite-primary)_85%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--graphite-canvas)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Import {picked.size || ""}
          </button>
        </div>
      </div>
    </div>
  );
}
