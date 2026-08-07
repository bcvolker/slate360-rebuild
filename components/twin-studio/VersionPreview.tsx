"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";
// Full navigation package (orbit + Walk mode + recenter + measure), format-aware.
// The first Preview shipped a bare splat viewer: GLB/Potree versions silently
// failed to load, and even splats could only be zoomed, not walked through.
import { TwinAuthenticatedViewer } from "@/components/digital-twin/TwinAuthenticatedViewer";

/**
 * D-gap fix — preview ANY ready model version without publishing it. Found
 * while dispatching the B-series verification runs: reprocessed models were
 * previously invisible until promoted, which made the mandatory R7.5 visual
 * gate impossible to perform non-destructively. The org-scoped model splat/
 * manifest routes always served any ready model by id; nothing rendered them.
 */
export function VersionPreview({
  spaceId,
  modelId,
  label,
  psnr,
  isPublished,
  viewerKind,
  modelUrl,
  modelTitle,
}: {
  spaceId: string;
  modelId: string;
  label: string;
  psnr: number | null;
  isPublished: boolean;
  viewerKind: TwinViewerKind;
  modelUrl: string;
  modelTitle: string;
}) {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(isPublished);
  const [error, setError] = useState<string | null>(null);

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/digital-twin/models/${modelId}/publish`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not publish");
      setPublished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/twin-studio/${spaceId}`}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-[var(--graphite-muted)] hover:text-zinc-100"
          >
            <ArrowLeft className="size-3.5" aria-hidden /> Studio
          </Link>
          <p className="truncate text-xs font-medium text-zinc-100">
            Version preview · {label}
            {psnr !== null ? ` · PSNR ${psnr.toFixed(2)}` : ""}
          </p>
        </div>
        {published ? (
          <span className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${twinAccent.iconChip}`}>
            <Check className="size-3" /> Live
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void publish()}
            disabled={publishing}
            className={`${twinAccent.button} shrink-0`}
          >
            {publishing ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            Publish this version
          </button>
        )}
      </div>
      {error ? <p className="px-3 pb-1 text-xs text-red-300">{error}</p> : null}
      <p className="shrink-0 px-3 pb-2 text-[10px] leading-snug text-[var(--graphite-muted)]">
        Not published — clients and share links do not see this version until you publish it.
      </p>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <TwinAuthenticatedViewer
          spaceId={spaceId}
          modelId={modelId}
          viewerKind={viewerKind}
          modelUrl={modelUrl}
          modelTitle={modelTitle}
          layerVisible={{ model: true, pins: true, measurements: true }}
          overlayPins={[]}
          overlayMeasurements={[]}
        />
      </div>
    </div>
  );
}
