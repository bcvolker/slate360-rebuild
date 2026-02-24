"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2, Pin, Ruler, X } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

type FolderRow = { id: string; name: string };
type DrawingFile = {
  id: string;
  name: string;
  type?: string;
  modified?: string;
};

function isPdf(file: DrawingFile): boolean {
  const ext = String(file.type ?? "").toLowerCase();
  return ext === "pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export default function ProjectDrawingsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<DrawingFile[]>([]);
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<DrawingFile | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const foldersRes = await fetch(`/api/slatedrop/project-folders?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" });
        const foldersPayload = (await foldersRes.json().catch(() => ({}))) as { folders?: FolderRow[] };
        const folders = Array.isArray(foldersPayload.folders) ? foldersPayload.folders : [];

        const drawingsFolder = folders.find((folder) => folder.name.toLowerCase() === "drawings");
        if (!drawingsFolder) {
          if (!cancelled) {
            setFiles([]);
            setUrlMap({});
          }
          return;
        }

        const filesRes = await fetch(`/api/slatedrop/files?folderId=${encodeURIComponent(drawingsFolder.id)}`, { cache: "no-store" });
        const filesPayload = (await filesRes.json().catch(() => ({}))) as { files?: DrawingFile[] };
        const pdfFiles = (Array.isArray(filesPayload.files) ? filesPayload.files : []).filter(isPdf);

        const signedEntries = await Promise.all(
          pdfFiles.map(async (file) => {
            const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(file.id)}`, { cache: "no-store" });
            const payload = (await res.json().catch(() => ({}))) as { url?: string };
            return [file.id, payload.url ?? ""] as const;
          })
        );

        if (!cancelled) {
          setFiles(pdfFiles);
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

  const activeUrl = useMemo(() => (activeFile ? urlMap[activeFile.id] : null), [activeFile, urlMap]);

  if (!projectId) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        Invalid project route.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Drawings</p>
        <h2 className="text-lg font-black text-gray-900">Plans & Drawings Viewer</h2>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
          <Loader2 size={16} className="mr-2 inline animate-spin" /> Loading drawings…
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
          No PDFs found in this project's Drawings folder.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {files.map((file) => {
            const url = urlMap[file.id];
            return (
              <button
                key={file.id}
                onClick={() => setActiveFile(file)}
                className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white text-left shadow-sm transition hover:border-indigo-200"
              >
                <div className="flex h-[220px] items-center justify-center bg-gray-50">
                  {url ? (
                    <Document file={url} loading={<Loader2 size={16} className="animate-spin text-gray-400" />}>
                      <Page pageNumber={1} width={260} renderTextLayer={false} renderAnnotationLayer={false} />
                    </Document>
                  ) : (
                    <p className="text-sm text-gray-400">Preview unavailable</p>
                  )}
                </div>
                <div className="border-t border-indigo-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500">{file.modified ?? ""}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {activeFile && (
        <div className="fixed inset-0 z-50 bg-black/75 p-4 md:p-8">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <p className="truncate text-sm font-semibold text-gray-800">{activeFile.name}</p>
              <button onClick={() => setActiveFile(null)} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2">
              <button className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                <Pin size={12} /> Add Pin
              </button>
              <button className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                <Ruler size={12} /> Measure
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              <div className="mx-auto w-fit rounded-lg bg-white p-2 shadow-sm">
                {activeUrl ? (
                  <Document file={activeUrl} loading={<Loader2 size={18} className="animate-spin text-gray-500" />}>
                    <Page pageNumber={1} width={900} />
                  </Document>
                ) : (
                  <p className="p-8 text-sm text-gray-500">Viewer unavailable for this file.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
