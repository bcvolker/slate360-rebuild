"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MonitorX } from "lucide-react";

/**
 * Every Twin viewer needs WebGL. When a browser has graphics acceleration turned
 * off (Chrome: "Use graphics acceleration when available" unchecked, or the GPU
 * blocklisted) the renderer cannot be created and the page used to sit on a
 * spinner forever. Say what is wrong and how to fix it instead.
 */
type GlState = "checking" | "ok" | "missing" | "software";

/** Software rasterisers draw a splat at a crawl; treat them like no GPU at all. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|microsoft basic render|software/i;

function detectWebgl(): GlState {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return "missing";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    return SOFTWARE_RENDERER.test(renderer) ? "software" : "ok";
  } catch {
    return "missing";
  }
}

export function WebglGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GlState>("checking");
  useEffect(() => {
    setState(detectWebgl());
  }, []);

  if (state === "checking" || state === "ok") return <>{children}</>;

  return (
    <div
      className="flex h-full min-h-[320px] w-full flex-col items-center justify-center gap-3 bg-[var(--graphite-canvas)] px-6 text-center"
      role="alert"
      data-twin-webgl="missing"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 text-[var(--twin360-blue)]">
        <MonitorX className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-zinc-100">
        {state === "software" ? "This browser is drawing 3D in software" : "This browser has 3D graphics turned off"}
      </p>
      <p className="max-w-md text-xs leading-relaxed text-zinc-400">
        {state === "software"
          ? "The graphics card is not being used, so the twin would load slowly and stutter. In Chrome, open chrome://gpu to see why; usually Settings → System → “Use graphics acceleration when available” needs to be on, or the GPU is blocklisted (chrome://flags → “Override software rendering list”). Microsoft Edge or Safari on this machine will also work."
          : "The twin needs WebGL, and this browser reports that hardware graphics are disabled. In Chrome, open Settings → System and turn on “Use graphics acceleration when available”, then relaunch. Or open this link in Microsoft Edge or Safari."}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
        chrome://gpu shows the current status
      </p>
    </div>
  );
}
