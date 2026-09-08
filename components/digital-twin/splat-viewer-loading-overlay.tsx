"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { formatTwinBytes } from "@/lib/digital-twin/format-bytes";

/** Loading state shown over the canvas: spinner, then a real byte-progress bar once
 * the download reports a total (or a running byte count when the total is unknown,
 * e.g. Brotli-encoded responses without Content-Length). */
export function SplatLoadingOverlay({
  bytesLoaded,
  bytesTotal,
}: {
  bytesLoaded: number;
  bytesTotal: number | null;
}) {
  const progressPct =
    bytesTotal != null && bytesTotal > 0 ? Math.min(100, Math.round((bytesLoaded / bytesTotal) * 100)) : null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--graphite-canvas)]/80 backdrop-blur-sm px-6">
      <Loader2 className={cn("size-7 animate-spin", twinAccent.spinner)} aria-hidden />
      <p className="text-xs font-medium tracking-wide text-zinc-300">Loading 3D twin…</p>
      {progressPct != null ? (
        <div className="mt-1 w-full max-w-[220px]">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--twin360-blue)] transition-[width]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-center font-mono text-[10px] tracking-wide text-zinc-500">
            {formatTwinBytes(bytesLoaded)} / {formatTwinBytes(bytesTotal ?? 0)}
          </p>
        </div>
      ) : bytesLoaded > 0 ? (
        <p className="mt-1 font-mono text-[10px] tracking-wide text-zinc-500">
          {formatTwinBytes(bytesLoaded)} loaded…
        </p>
      ) : null}
    </div>
  );
}
