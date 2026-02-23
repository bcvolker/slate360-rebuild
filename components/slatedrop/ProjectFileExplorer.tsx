"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Folder, FileText } from "lucide-react";

type FolderRow = {
  id: string;
  name: string;
  path: string;
};

type FileRow = {
  id: string;
  name: string;
  size: number;
  type: string;
  modified: string;
};

export default function ProjectFileExplorer({
  projectId,
  rootFolderId,
}: {
  projectId: string;
  rootFolderId: string;
}) {
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const [filesLoading, setFilesLoading] = useState(false);
  const [files, setFiles] = useState<FileRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadFolders = async () => {
      setFoldersLoading(true);
      try {
        const response = await fetch(`/api/slatedrop/project-folders?projectId=${encodeURIComponent(rootFolderId)}`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        const folderRows = Array.isArray(payload?.folders) ? payload.folders : [];
        setFolders(folderRows);
        setActiveFolderId(folderRows[0]?.id ?? null);
      } finally {
        if (!cancelled) setFoldersLoading(false);
      }
    };

    void loadFolders();
    return () => {
      cancelled = true;
    };
  }, [projectId, rootFolderId]);

  useEffect(() => {
    if (!activeFolderId) {
      setFiles([]);
      return;
    }

    let cancelled = false;

    const loadFiles = async () => {
      setFilesLoading(true);
      try {
        const response = await fetch(`/api/slatedrop/files?folderId=${encodeURIComponent(activeFolderId)}`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        setFiles(Array.isArray(payload?.files) ? payload.files : []);
      } finally {
        if (!cancelled) setFilesLoading(false);
      }
    };

    void loadFiles();

    return () => {
      cancelled = true;
    };
  }, [activeFolderId]);

  const activeFolder = useMemo(() => folders.find((folder) => folder.id === activeFolderId) ?? null, [folders, activeFolderId]);

  return (
    <div className="grid min-h-[65vh] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-gray-900">Project Folders</h2>
        <p className="mt-1 text-xs text-gray-500">Scoped to this project only</p>

        <div className="mt-4 space-y-2">
          {foldersLoading ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-500">
              <Loader2 size={14} className="mr-2 inline animate-spin" /> Loading folders…
            </div>
          ) : folders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-3 py-3 text-sm text-gray-500">
              No project folders found.
            </div>
          ) : (
            folders.map((folder) => {
              const active = folder.id === activeFolderId;
              return (
                <button
                  key={folder.id}
                  onClick={() => setActiveFolderId(folder.id)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    active
                      ? "border-[#FF4D00]/40 bg-[#FF4D00]/10 text-[#FF4D00]"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Folder size={14} />
                  <span className="truncate">{folder.name}</span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-gray-900">{activeFolder?.name ?? "Files"}</h2>
        <p className="mt-1 text-xs text-gray-500">{activeFolder?.path ?? "Select a folder to view files"}</p>

        <div className="mt-4 space-y-2">
          {filesLoading ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-500">
              <Loader2 size={14} className="mr-2 inline animate-spin" /> Loading files…
            </div>
          ) : files.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-3 py-8 text-center text-sm text-gray-500">
              No files in this folder yet.
            </div>
          ) : (
            files.map((file) => (
              <article key={file.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800">{file.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">{file.type || "file"}</p>
                </div>
                <FileText size={14} className="shrink-0 text-gray-400" />
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
