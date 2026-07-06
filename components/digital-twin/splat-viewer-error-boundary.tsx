"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export const SPLAT_VIEWER_SURFACE =
  "relative min-h-0 w-full overflow-hidden bg-[var(--graphite-canvas)]";

export function ErrorCard({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        SPLAT_VIEWER_SURFACE,
        // Calm, on-system state (not an alarming red box) — a model that didn't
        // load usually just needs a retry, or a reprocess from the Versions sheet.
        "flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 text-center",
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[var(--graphite-muted)]">
        <AlertTriangle className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-sm font-semibold text-zinc-100">This model didn&apos;t load</p>
      <p className="max-w-xs text-xs leading-relaxed text-[var(--graphite-muted)]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)] px-4 py-2 text-xs font-semibold text-[var(--twin360-blue)] transition active:scale-[0.98]"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Try again
        </button>
      ) : null}
    </div>
  );
}

// React error boundaries must be class components — this catches any uncaught render
// error inside the Canvas subtree (e.g. a corrupt file crashing the Spark decoder) so
// it never unmounts to a blank/white screen.
export class SplatErrorBoundary extends Component<
  { children: ReactNode; resetKey: number | string; onRetry: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: { resetKey: number | string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorCard
          message="Something went wrong rendering this model. Check your connection and try again."
          onRetry={this.props.onRetry}
          className="absolute inset-0"
        />
      );
    }
    return this.props.children;
  }
}
