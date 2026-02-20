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
import { useRef, useEffect } from "react";
import Script from "next/script";

interface ModelViewerClientProps {
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  cameraOrbit?: string;
  shadowIntensity?: number;
  shadowSoftness?: number;
  interactive?: boolean;
}

export default function ModelViewerClient({
  src,
  alt = "3D model",
  style,
  cameraOrbit,
  shadowIntensity,
  shadowSoftness,
  interactive = true,
}: ModelViewerClientProps) {
  const ref = useRef<HTMLElement>(null);

  const defaultStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    background: "transparent",
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
    if (interactive) {
      el.setAttribute("camera-controls", "");
      el.removeAttribute("interaction-prompt");
      el.removeAttribute("disable-tap");
    } else {
      el.removeAttribute("camera-controls");
      el.setAttribute("interaction-prompt", "none");
      el.setAttribute("disable-tap", "");
    }
  }, [cameraOrbit, shadowIntensity, shadowSoftness, interactive]);

  return (
    <>
      {/* @ts-ignore — model-viewer is a custom web component */}
      <model-viewer
        ref={ref}
        src={src}
        alt={alt}
        style={style ?? defaultStyle}
      />
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
        strategy="lazyOnload"
        crossOrigin="anonymous"
      />
    </>
  );
}
