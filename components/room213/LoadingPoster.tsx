"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { markTiming } from "@/lib/room213/timing";
import type { ModelProgress } from "@/components/room213/Room213Model";

const MB = 1024 * 1024;

/**
 * Poster-first loading. The poster is in the server HTML (visible before any JS), labelled as a preview; byte
 * progress is shown only while the transfer is exact, then "Preparing 3D…" (indeterminate, never a stuck 100%).
 * It fades out only once a correctly posed 3D frame exists. Errors keep the poster and offer Try again.
 */
export function LoadingPoster({
  phase,
  progress,
  error,
  onRetry,
  posterMode,
}: {
  phase: "loading" | "preparing" | "ready" | "error";
  progress: ModelProgress;
  error: string | null;
  onRetry?: () => void;
  posterMode: boolean;
}) {
  const [gone, setGone] = useState(false);
  // The poster usually finishes before hydration (it is in the server HTML), so onLoad never fires: take its real
  // arrival time from resource timing instead.
  useEffect(() => {
    const e = performance.getEntriesByType("resource").find((r) => r.name.includes("/preview/room213/poster-")) as PerformanceResourceTiming | undefined;
    if (e) markTiming("posterVisible", Math.round(e.responseEnd));
  }, []);
  useEffect(() => {
    if (phase !== "ready") return setGone(false);
    const t = window.setTimeout(() => setGone(true), 700);
    return () => window.clearTimeout(t);
  }, [phase]);
  if (posterMode || gone) return null;

  const pct = progress.total ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : null;
  const transfer = phase === "loading" && progress.phase === "transfer";
  return (
    <div className={`absolute inset-0 z-20 transition-opacity duration-700 ${phase === "ready" ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      <picture>
        <source media="(orientation: portrait)" srcSet="/preview/room213/poster-portrait.jpg" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/preview/room213/poster-landscape.jpg"
          alt="Payne Hall Room 213 — preview image of the 3D capture"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
          onLoad={() => markTiming("posterVisible")}
          onError={(e) => (e.currentTarget.style.visibility = "hidden")}
        />
      </picture>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--graphite-canvas)] to-transparent px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-16">
        <div className="mx-auto max-w-sm text-center" role="status" aria-live="polite">
          {phase === "error" ? (
            <>
              <p className="text-[15px] font-semibold text-[var(--mkt-surface)]">The 3D capture didn&apos;t load</p>
              <p className="mt-1 text-[12px] text-[var(--mkt-canvas-deep)]">{error ?? "Check your connection and try again."}</p>
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[var(--mkt-surface)] px-5 text-[13px] font-semibold text-[var(--mkt-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--mkt-brand-green)]"
                >
                  <RotateCcw className="size-4" aria-hidden /> Try again
                </button>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-[14px] font-semibold text-[var(--mkt-surface)]">
                {transfer ? "Loading the 3D capture" : "Preparing 3D…"}
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-sm bg-[color-mix(in_srgb,var(--mkt-surface)_22%,transparent)]">
                {transfer && pct !== null ? (
                  <div className="h-full bg-[var(--mkt-brand-green)] transition-[width] duration-300" style={{ width: `${pct}%` }} />
                ) : (
                  <div className="room213-indeterminate h-full w-1/3 bg-[var(--mkt-brand-green)]" />
                )}
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-[var(--mkt-canvas-deep)]">
                {transfer
                  ? progress.total
                    ? `${Math.round(progress.loaded / MB)} of ${Math.round(progress.total / MB)} MB`
                    : `${Math.round(progress.loaded / MB)} MB`
                  : "Almost there"}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
