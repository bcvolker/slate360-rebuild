"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

/**
 * Error boundary for the Digital Twin route tree. Without this, any thrown error (e.g. a
 * still-processing twin with no model file) escaped to the root app/global-error.tsx — a
 * dead-end "Something went wrong" with NO back button (force-close territory). This gives a
 * recoverable screen with Try again + Back to twins, in Graphite-Glass dark chrome.
 */
export default function DigitalTwinError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[digital-twin] route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-[var(--graphite-canvas)] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <AlertTriangle size={26} className="text-[var(--twin360-blue)]" />
      </div>
      <div className="max-w-sm">
        <h2 className="text-lg font-bold text-[var(--graphite-text-header)]">Something went wrong</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--graphite-muted)]">
          This twin couldn&apos;t be opened. If it&apos;s still processing, it&apos;ll be ready in a
          few minutes — head back and try again shortly.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[10px] text-[var(--graphite-muted)]">ID: {error.digest}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/digital-twin/twins"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-[var(--graphite-text-body)] transition-colors hover:bg-white/[0.07]"
        >
          <ArrowLeft size={14} />
          Back to twins
        </Link>
        <button
          onClick={reset}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--twin360-blue)_40%,transparent)] bg-transparent px-4 text-sm font-semibold text-[var(--twin360-blue)] transition-colors hover:bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)]"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    </div>
  );
}
