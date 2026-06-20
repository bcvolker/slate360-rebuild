"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Download, Link2, Check, Package } from "lucide-react";

interface DesignExport {
  id: string;
  format: string;
  status: string;
  created_at: string;
  downloadUrl: string | null;
  shareUrl: string | null;
}

/** Exports tab: download the current model and manage share links. */
export function ExportsTab({
  sessionId,
  activeVariantId,
}: {
  sessionId: string | null;
  activeVariantId: string | null;
}) {
  const [exports, setExports] = useState<DesignExport[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    const res = await fetch(`/api/design-studio/sessions/${sessionId}/exports`);
    const data = await res.json();
    if (res.ok) setExports(data.exports ?? []);
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createExport() {
    if (!sessionId || !activeVariantId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/design-studio/sessions/${sessionId}/exports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: activeVariantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Export failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyShare(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  if (!sessionId) {
    return <Centered>Import a twin to create exports.</Centered>;
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Exports</h2>
        <button
          onClick={createExport}
          disabled={busy || !activeVariantId}
          className="flex items-center gap-1.5 rounded-md bg-[#3D8EFF] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3580E6] disabled:bg-white/10 disabled:text-slate-500"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Package className="size-3.5" />}
          Export current model
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}

      {exports === null ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="size-3.5 animate-spin" /> Loading…
        </div>
      ) : exports.length === 0 ? (
        <Centered>No exports yet. Click “Export current model” to create a downloadable file + share link.</Centered>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {exports.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200">{e.format.toUpperCase()}</p>
                <p className="text-[10px] text-slate-500">{new Date(e.created_at).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {e.downloadUrl && (
                  <a
                    href={e.downloadUrl}
                    download
                    className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5"
                  >
                    <Download className="size-3" /> Download
                  </a>
                )}
                {e.shareUrl && (
                  <button
                    onClick={() => copyShare(e.shareUrl as string, e.id)}
                    className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5"
                  >
                    {copied === e.id ? <Check className="size-3 text-emerald-400" /> : <Link2 className="size-3" />}
                    {copied === e.id ? "Copied" : "Share link"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center text-center text-sm text-slate-600">{children}</div>;
}
