"use client";

import { useState } from "react";
import { classifySource, ingestHint } from "@/lib/spatial-walkthrough/source-class";

const PART = 8 * 1024 * 1024;

type Props = {
  walkthroughId: string;
  onQueued: () => void;
};

export function StudioUpload({ walkthroughId, onQueued }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | null) => {
    if (!file) return;
    const kind = classifySource({ fileName: file.name, mime: file.type });
    if (kind === "RAW_INSTA360") {
      setError(ingestHint(kind) ?? "Export required in Insta360 Studio.");
      return;
    }
    if (kind === "DOCUMENT" || kind === "LIDAR" || kind === "IPHONE_RGBD" || kind === "RGBD_IPHONE") {
      setError(ingestHint(kind) ?? "This source is not a walkthrough sphere.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const initRes = await fetch(`/api/spatial-walkthrough/${walkthroughId}/upload?action=init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "video/mp4", size: file.size }),
      });
      const init = await initRes.json();
      if (!initRes.ok) throw new Error(init.error || "Upload failed");
      const totalParts = Number(init.totalParts ?? 1);
      const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);
      const signRes = await fetch(`/api/spatial-walkthrough/${walkthroughId}/upload?action=sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipId: init.clip.id, partNumbers }),
      });
      const signed = await signRes.json();
      if (!signRes.ok) throw new Error(signed.error || "Could not sign upload");
      const etags: Array<{ partNumber: number; etag: string }> = [];
      for (const part of signed.parts as Array<{ partNumber: number; signedUrl: string }>) {
        const start = (part.partNumber - 1) * PART;
        const blob = file.slice(start, Math.min(start + PART, file.size));
        const put = await fetch(part.signedUrl, { method: "PUT", body: blob });
        if (!put.ok) throw new Error("Part upload failed");
        etags.push({ partNumber: part.partNumber, etag: put.headers.get("ETag") || "" });
      }
      const completeRes = await fetch(`/api/spatial-walkthrough/${walkthroughId}/upload?action=complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipId: init.clip.id, parts: etags }),
      });
      const complete = await completeRes.json();
      if (!completeRes.ok) throw new Error(complete.error || "Could not finish upload");
      onQueued();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-white/10 bg-white/[0.04] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Master capture</p>
      <p className="mt-1 text-sm text-[var(--graphite-muted)]">Upload a stitched 2:1 equirectangular MP4. The original is kept immutable.</p>
      <input
        type="file"
        accept="video/mp4,video/quicktime,.insv"
        disabled={busy}
        className="mt-3 block w-full text-sm"
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />
      {busy ? <p className="mt-2 text-sm text-[var(--graphite-muted)]">Uploading…</p> : null}
      {error ? <p className="mt-2 text-sm">{error}</p> : null}
    </div>
  );
}
