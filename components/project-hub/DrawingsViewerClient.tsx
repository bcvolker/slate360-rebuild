"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Pin, Ruler, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type DrawingFile = {
  id: string;
  name: string;
  createdAt: string | null;
};

export default function DrawingsViewerClient({ files }: { files: DrawingFile[] }) {
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeFile, setActiveFile] = useState<DrawingFile | null>(null);
  const [demoFiles, setDemoFiles] = useState<DrawingFile[]>([]);

  const visibleFiles = useMemo(() => (files.length > 0 ? files : demoFiles), [files, demoFiles]);

  useEffect(() => {
    let cancelled = false;

    const loadSignedUrls = async () => {
      setLoading(true);
      try {
        const entries = await Promise.all(
          files.map(async (file) => {
            const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(file.id)}`);
            const payload = await res.json().catch(() => ({}));
            return [file.id, payload?.url ?? ""] as const;
          })
        );

        if (!cancelled) {
          const next = entries.reduce<Record<string, string>>((acc, [id, url]) => {
            if (url) acc[id] = url;
            return acc;
          }, {});
          setUrlMap(next);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadSignedUrls();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const activeUrl = useMemo(() => (activeFile ? urlMap[activeFile.id] : null), [activeFile, urlMap]);
  const showingDemo = files.length === 0 && demoFiles.length > 0;

  return (
    <section className="space-y-4">
      <header>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Drawings</p>
            <h2 className="text-lg font-black text-gray-900">Plans & Drawings</h2>
          </div>
          {showingDemo && (
            <button
              onClick={() => {
                setDemoFiles([]);
                setActiveFile(null);
              }}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Clear Demo
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
          <Loader2 size={16} className="mr-2 inline animate-spin" /> Loading drawing previews…
        </div>
      ) : visibleFiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
          <p>No PDFs found in Drawings.</p>
          <button
            onClick={() =>
              setDemoFiles([
                {
                  id: "demo-drawing-1",
                  name: "Demo Site Plan A1.pdf",
                  createdAt: new Date().toISOString(),
                },
              ])
            }
            className="mt-3 rounded-md bg-[#FF4D00] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#E64500]"
          >
            Add Demo Drawing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleFiles.map((file) => {
            const fileUrl = urlMap[file.id];
            return (
              <button
                key={file.id}
                onClick={() => setActiveFile(file)}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition hover:border-gray-300"
              >
                <div className="flex h-[220px] items-center justify-center bg-gray-50">
                  {fileUrl ? (
                    <Document file={fileUrl} loading={<Loader2 size={16} className="animate-spin text-gray-400" />}>
                      <Page pageNumber={1} width={260} renderTextLayer={false} renderAnnotationLayer={false} />
                    </Document>
                  ) : (
                    <p className="text-sm text-gray-400">Preview unavailable</p>
                  )}
                </div>
                <div className="border-t border-gray-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500">{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : ""}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {activeFile && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 md:p-8">
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
