"use client";

import { useEffect, useState } from "react";
import { Loader2, FileImage, ArrowUpRight, Download, Check, Link as LinkIcon } from "lucide-react";

type PhotoFile = {
  id: string;
  name: string;
  createdAt?: string | null;
};

export default function PhotoLogClient({ projectId, files }: { projectId: string; files: PhotoFile[] }) {
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [latestReport, setLatestReport] = useState<{ fileId: string; fileName: string; url: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [demoPhotos, setDemoPhotos] = useState<PhotoFile[]>([]);

  const visibleFiles = files.length > 0 ? files : demoPhotos;
  const showingDemo = files.length === 0 && demoPhotos.length > 0;

  useEffect(() => {
    let cancelled = false;

    const loadUrls = async () => {
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

    void loadUrls();
    return () => {
      cancelled = true;
    };
  }, [files]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const generateReport = async () => {
    setIsGeneratingReport(true);
    setCopied(false);
    try {
      const response = await fetch(`/api/projects/${projectId}/photo-report`, {
        method: "POST",
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setToast(payload?.error ?? "Failed to generate photo report");
        return;
      }

      const fileId = typeof payload?.fileId === "string" ? payload.fileId : "";
      const fileName = typeof payload?.fileName === "string" ? payload.fileName : "photo-report.pdf";

      let signedUrl: string | null = null;
      if (fileId) {
        const dlRes = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(fileId)}`);
        const dlPayload = await dlRes.json().catch(() => ({}));
        if (dlRes.ok && typeof dlPayload?.url === "string") {
          signedUrl = dlPayload.url;
        }
      }

      setLatestReport(fileId ? { fileId, fileName, url: signedUrl } : null);

      setToast(`Photo report saved to Reports (${payload?.photoCount ?? 0} photos).`);
    } catch {
      setToast("Failed to generate photo report");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const copyReportLink = async () => {
    if (!latestReport?.url) return;
    try {
      await navigator.clipboard.writeText(latestReport.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Photos</p>
          <h2 className="text-lg font-black text-gray-900">Photo Log</h2>
        </div>

        <div className="flex items-center gap-2">
          {showingDemo && (
            <button
              onClick={() => setDemoPhotos([])}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Clear Demo
            </button>
          )}
          <button
            onClick={generateReport}
            disabled={isGeneratingReport || visibleFiles.length === 0}
            className="rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E64500] disabled:opacity-60"
          >
            {isGeneratingReport ? "Generating..." : "Generate Photo Report"}
          </button>
        </div>
      </div>

      {latestReport && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
          <p className="text-xs font-semibold text-emerald-800">Latest Photo Report</p>
          <p className="mt-1 truncate text-xs text-emerald-700">{latestReport.fileName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <a
              href={latestReport.url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
            >
              <ArrowUpRight size={12} /> View
            </a>
            <a
              href={latestReport.url ?? "#"}
              download={latestReport.fileName}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
            >
              <Download size={12} /> Download
            </a>
            <button
              onClick={copyReportLink}
              disabled={!latestReport.url}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 disabled:opacity-60"
            >
              {copied ? <Check size={12} /> : <LinkIcon size={12} />} {copied ? "Copied" : "Copy Link"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
          <Loader2 size={16} className="mr-2 inline animate-spin" /> Loading photos…
        </div>
      ) : visibleFiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
          <p>No photos found in Photos.</p>
          <button
            onClick={() =>
              setDemoPhotos([
                { id: "demo-photo-1", name: "Demo Exterior Progress.jpg" },
                { id: "demo-photo-2", name: "Demo Interior Framing.jpg" },
              ])
            }
            className="mt-3 rounded-md bg-[#FF4D00] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#E64500]"
          >
            Add Demo Photos
          </button>
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {visibleFiles.map((file) => (
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
