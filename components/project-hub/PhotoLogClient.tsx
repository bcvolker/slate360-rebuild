"use client";

import { useEffect, useState } from "react";
import { Loader2, FileImage } from "lucide-react";

type PhotoFile = {
  id: string;
  name: string;
};

export default function PhotoLogClient({ files }: { files: PhotoFile[] }) {
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

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

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Photos</p>
          <h2 className="text-lg font-black text-gray-900">Photo Log</h2>
        </div>

        <button
          onClick={() => setToast("Photo Report PDF Generating...")}
          className="rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E64500]"
        >
          Generate Photo Report
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
          <Loader2 size={16} className="mr-2 inline animate-spin" /> Loading photos…
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">No photos found in Photos.</div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {files.map((file) => (
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
