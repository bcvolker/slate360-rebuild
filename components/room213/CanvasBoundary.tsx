"use client";

import { Component, type ReactNode } from "react";

/** Catches a 3D start-up failure (WebGL/shader/renderer construction) so it becomes the bounded "Try again" state. */
export class CanvasBoundary extends Component<{ onError: (message: string) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[room213] 3D view failed to start:", error);
    this.props.onError(error instanceof Error ? error.message : String(error));
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** True when this browser can create a WebGL2 context (Spark requires WebGL2). */
export function webgl2Available(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}
