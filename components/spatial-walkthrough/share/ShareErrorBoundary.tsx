"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

export class ShareErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[WalkthroughShare]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--graphite-canvas)] px-6 text-center">
        <p className="text-sm text-[var(--graphite-text-header)]">This walkthrough could not start.</p>
        <button
          type="button"
          className="mt-4 min-h-11 px-4 text-sm text-[var(--graphite-primary)]"
          onClick={() => this.setState({ error: null })}
        >
          Retry
        </button>
      </div>
    );
  }
}
