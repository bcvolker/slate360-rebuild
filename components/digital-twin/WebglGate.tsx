"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MonitorX } from "lucide-react";

/**
 * Every Twin viewer needs WebGL. When a browser has graphics acceleration turned
 * off (Chrome: "Use graphics acceleration when available" unchecked, or the GPU
 * blocklisted) the renderer cannot be created and the page used to sit on a
 * spinner forever. Say what is wrong and how to fix it instead.
 */
function detectWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function WebglGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "ok" | "missing">("checking");
  useEffect(() => {
    setState(detectWebgl() ? "ok" : "missing");
  }, []);

  if (state !== "missing") return <>{children}</>;

  return (
    <div
      className="flex h-full min-h-[320px] w-full flex-col items-center justify-center gap-3 bg-[var(--graphite-canvas)] px-6 text-center"
      role="alert"
      data-twin-webgl="missing"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 text-[var(--twin360-blue)]">
        <MonitorX className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-zinc-100">This browser has 3D graphics turned off</p>
      <p className="max-w-md text-xs leading-relaxed text-zinc-400">
        The twin needs WebGL, and this browser reports that hardware graphics are disabled. In
        Chrome, open Settings → System and turn on &ldquo;Use graphics acceleration when
        available&rdquo;, then relaunch. Or open this link in Microsoft Edge or Safari.
      </p>
      <p className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
        chrome://gpu shows the current status
      </p>
    </div>
  );
}
