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
        "flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-8 text-red-300" aria-hidden />
      <p className="text-sm font-medium text-red-100">Unable to load 3D model</p>
      <p className="max-w-sm text-xs text-red-200/80">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-100 transition-colors hover:bg-red-500/25"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Retry
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
