"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { FileImage, Loader2 } from "lucide-react";

type FolderRow = { id: string; name: string };
type PhotoFile = {
  id: string;
  name: string;
  type?: string;
  modified?: string;
};

function isImage(file: PhotoFile): boolean {
  const ext = String(file.type ?? "").toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "svg"].includes(ext);
}

export default function ProjectPhotosPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [files, setFiles] = useState<PhotoFile[]>([]);
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const foldersRes = await fetch(`/api/slatedrop/project-folders?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" });
        const foldersPayload = (await foldersRes.json().catch(() => ({}))) as { folders?: FolderRow[] };
        const folders = Array.isArray(foldersPayload.folders) ? foldersPayload.folders : [];

        const photosFolder = folders.find((folder) => folder.name.toLowerCase() === "photos");
        if (!photosFolder) {
          if (!cancelled) {
            setFiles([]);
            setUrlMap({});
          }
          return;
        }

        const filesRes = await fetch(`/api/slatedrop/files?folderId=${encodeURIComponent(photosFolder.id)}`, { cache: "no-store" });
        const filesPayload = (await filesRes.json().catch(() => ({}))) as { files?: PhotoFile[] };
        const imageFiles = (Array.isArray(filesPayload.files) ? filesPayload.files : []).filter(isImage);

        const signedEntries = await Promise.all(
          imageFiles.map(async (file) => {
            const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(file.id)}`, { cache: "no-store" });
            const payload = (await res.json().catch(() => ({}))) as { url?: string };
            return [file.id, payload.url ?? ""] as const;
          })
        );

        if (!cancelled) {
          setFiles(imageFiles);
          setUrlMap(
            signedEntries.reduce<Record<string, string>>((acc, [id, url]) => {
              if (url) acc[id] = url;
              return acc;
            }, {})
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const orderedFiles = useMemo(() => files, [files]);

  const onGenerateReport = async () => {
    if (!projectId || generating) return;
    setGenerating(true);
    setToast("Generating photo report…");

    try {
      const res = await fetch(`/api/projects/${projectId}/photo-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const payload = (await res.json().catch(() => ({}))) as { error?: string; fileName?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to generate photo report");
      }

      setToast(`Photo report generated: ${payload.fileName ?? "PDF created"}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to generate photo report");
    } finally {
      setGenerating(false);
    }
  };

  if (!projectId) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        Invalid project route.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Photos</p>
          <h2 className="text-lg font-black text-gray-900">Photo Log</h2>
        </div>

        <button
          onClick={onGenerateReport}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E64500] disabled:opacity-60"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : null}
          {generating ? "Generating…" : "Generate Photo Report"}
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
          <Loader2 size={16} className="mr-2 inline animate-spin" /> Loading photos…
        </div>
      ) : orderedFiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
          No photos found in this project's Photos folder.
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {orderedFiles.map((file) => (
            <article key={file.id} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {urlMap[file.id] ? (
                <img src={urlMap[file.id]} alt={file.name} className="h-auto w-full object-cover" />
              ) : (
                <div className="flex h-48 items-center justify-center bg-gray-50 text-gray-400">
                  <FileImage size={20} />
                </div>
              )}
              <div className="border-t border-gray-100 px-3 py-2">
                <p className="truncate text-sm font-semibold text-gray-800">{file.name}</p>
                <p className="text-xs text-gray-500">{file.modified ?? ""}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">
          {toast}
        </div>
      )}
    </section>
  );
}
