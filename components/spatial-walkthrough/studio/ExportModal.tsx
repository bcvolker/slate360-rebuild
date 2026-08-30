"use client";

import { useState } from "react";
import type { AccessPolicy } from "@/lib/spatial-walkthrough/types";

type Props = {
  walkthroughId: string;
  clipId: string;
  open: boolean;
  onClose: () => void;
};

export function ExportModal({ walkthroughId, clipId, open, onClose }: Props) {
  const [policy, setPolicy] = useState<AccessPolicy>("client");
  const [includePdf, setIncludePdf] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const run = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/spatial-walkthrough/${walkthroughId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policy,
        includePdf,
        includeMaster: false,
        stillClipId: clipId || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Export failed.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spatial-walkthrough-export.zip";
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md space-y-4 border border-white/10 bg-[var(--graphite-canvas)] p-5 text-[var(--graphite-text-header)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Export package</p>
        <h2 className="text-lg font-semibold">Spatial Walkthrough ZIP</h2>
        <p className="text-sm text-[var(--graphite-muted)]">
          README, registers, approved attachments, share link, capture metadata, optional still and summary PDF.
          Master 360 is never included.
        </p>
        <select value={policy} onChange={(e) => setPolicy(e.target.value as AccessPolicy)} className="h-11 w-full border border-white/10 bg-transparent px-2">
          <option value="client">CLIENT recipient</option>
          <option value="public">PUBLIC recipient</option>
        </select>
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={includePdf} onChange={(e) => setIncludePdf(e.target.checked)} />
          Include branded summary PDF
        </label>
        {error ? <p className="text-sm">{error}</p> : null}
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => void run()} className="h-11 flex-1 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] text-[var(--graphite-primary)]">
            {busy ? "Building…" : "Download ZIP"}
          </button>
          <button type="button" onClick={onClose} className="h-11 px-4 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
