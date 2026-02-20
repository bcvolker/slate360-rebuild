"use client";
/**
 * ModelViewerClient — renders Google's model-viewer web component.
 * Must be imported with next/dynamic + ssr:false to avoid React hydration
 * mismatches caused by the custom element being unknown on the server.
 */
import Script from "next/script";

interface ModelViewerClientProps {
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  cameraOrbit?: string;
  shadowIntensity?: number;
  shadowSoftness?: number;
}

export default function ModelViewerClient({
  src,
  alt = "3D model",
  style,
  cameraOrbit,
  shadowIntensity,
  shadowSoftness,
}: ModelViewerClientProps) {
  const defaultStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    background: "transparent",
  };

  const extras: Record<string, string> = {};
  if (cameraOrbit) extras["camera-orbit"] = cameraOrbit;
  if (shadowIntensity !== undefined)
    extras["shadow-intensity"] = String(shadowIntensity);
  if (shadowSoftness !== undefined)
    extras["shadow-softness"] = String(shadowSoftness);

  return (
    <>
      {/* @ts-ignore — model-viewer is a custom web component */}
      <model-viewer
        src={src}
        alt={alt}
        auto-rotate
        camera-controls
        environment-image="neutral"
        exposure="0.8"
        style={style ?? defaultStyle}
        {...extras}
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
