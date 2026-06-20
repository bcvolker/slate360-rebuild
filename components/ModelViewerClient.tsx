"use client";
/**
 * ModelViewerClient — renders Google's model-viewer web component.
 * Must be imported with next/dynamic + ssr:false to avoid React hydration
 * mismatches caused by the custom element being unknown on the server.
 *
 * IMPORTANT: We use a ref + useEffect to imperatively set attributes like
 * `orientation` because React does NOT reliably pass JSX props/spread to
 * custom web‑component elements via `setAttribute`.
 */
import { useRef, useEffect, useState } from "react";
import Script from "next/script";
import { cn } from "@/lib/utils";

interface ModelViewerClientProps {
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  cameraOrbit?: string;
  shadowIntensity?: number;
  shadowSoftness?: number;
  interactive?: boolean;
  scrollInterceptGate?: boolean;
}

export default function ModelViewerClient({
  src,
  alt = "3D model",
  style,
  cameraOrbit,
  shadowIntensity,
  shadowSoftness,
  interactive = true,
  scrollInterceptGate = true,
}: ModelViewerClientProps) {
  const ref = useRef<HTMLElement>(null);
  const [interactionEnabled, setInteractionEnabled] = useState(!scrollInterceptGate);

  const defaultStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    background: "#0B0F15",
    display: "block",
  };

  /* Imperatively set attributes that React's JSX doesn't reliably pass
     to custom web‑component elements */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (cameraOrbit) el.setAttribute("camera-orbit", cameraOrbit);
    if (shadowIntensity !== undefined)
      el.setAttribute("shadow-intensity", String(shadowIntensity));
    if (shadowSoftness !== undefined)
      el.setAttribute("shadow-softness", String(shadowSoftness));
    el.setAttribute("environment-image", "neutral");
    el.setAttribute("exposure", "0.8");
    el.setAttribute("auto-rotate", "");
    // Frame the whole model, centered and fully on-screen, on load + resize.
    // The "auto" orbit RADIUS tells model-viewer to fit the model to the
    // viewport regardless of where its geometry sits relative to the origin —
    // this fixes models that load off-center / off-screen (incl. surveyed/CAD
    // exports and twin deliverables). Don't pin field-of-view or a fixed zoom
    // range, which would override that auto-framing.
    if (!cameraOrbit) el.setAttribute("camera-orbit", "0deg 75deg auto");
    el.setAttribute("camera-target", "auto auto auto");
    el.removeAttribute("field-of-view");
    el.setAttribute("min-camera-orbit", "auto auto auto");
    el.setAttribute("max-camera-orbit", "auto auto auto");
    if (interactive && interactionEnabled) {
      el.setAttribute("camera-controls", "");
      el.removeAttribute("interaction-prompt");
      el.removeAttribute("disable-tap");
    } else {
      el.removeAttribute("camera-controls");
      el.setAttribute("interaction-prompt", "none");
      el.setAttribute("disable-tap", "");
    }
  }, [cameraOrbit, shadowIntensity, shadowSoftness, interactive, interactionEnabled]);

  return (
    <>
      <div
        className={cn(
          "relative h-full w-full",
          scrollInterceptGate && !interactionEnabled
            ? "pointer-events-none"
            : "pointer-events-auto",
        )}
      >
        {/* @ts-ignore — model-viewer is a custom web component */}
        <model-viewer
          ref={ref}
          src={src}
          alt={alt}
          style={style ?? defaultStyle}
        />
        {scrollInterceptGate && !interactionEnabled ? (
          <button
            type="button"
            onClick={() => setInteractionEnabled(true)}
            className="pointer-events-auto absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/[0.12] bg-[#0B0F15]/75 px-4 py-2 text-xs font-medium tracking-wide text-slate-300 shadow-lg backdrop-blur-xl transition-all duration-150 hover:border-[#00E699]/30 hover:text-[#00E699] active:scale-[0.98]"
            aria-label="Enable 3D model rotation"
          >
            [ ✦ Tap to Rotate 3D Model ]
          </button>
        ) : null}
      </div>
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
    </>
  );
}
