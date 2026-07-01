"use client";

import { useEffect, useRef, useState } from "react";
import { overlayToPixels } from "@/lib/branding/overlay-math";
import type { ResolvedDeliverableBranding } from "@/lib/branding/overlay-types";

/**
 * Renders the resolved logo overlay as an absolutely-positioned, non-interactive layer over a
 * viewer canvas (Site Walk cinematic media OR the Twin splat canvas). Uses normalized coordinates
 * so placement matches the PDF bake exactly. Tracks its own size so it stays correct on resize.
 * Design: docs/design/DELIVERABLE_BRANDING_LOCKED.md.
 */
export function BrandOverlay({ branding }: { branding: ResolvedDeliverableBranding | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const overlay = branding?.overlay;
  if (!overlay?.enabled || !branding?.logoUrl || size.w === 0) {
    // Still render the sizing sensor so it's ready once branding/logo arrive.
    return <div ref={ref} className="pointer-events-none absolute inset-0" aria-hidden />;
  }

  const rect = overlayToPixels(overlay.transform, size.w, size.h);
  const fontPx = Math.max(9, Math.round(size.w * 0.012));

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      <div style={{ position: "absolute", left: rect.left, top: rect.top, width: rect.width, opacity: rect.opacity }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- branding logo is an arbitrary org URL */}
        <img src={branding.logoUrl} alt="" className="block w-full select-none object-contain drop-shadow" draggable={false} />
        {overlay.textLines?.map((line) => (
          <div
            key={line.id}
            className="mt-0.5 font-mono uppercase tracking-wide text-white drop-shadow"
            style={{ fontSize: line.size === "legal" ? fontPx * 0.85 : line.size === "subtitle" ? fontPx * 1.1 : fontPx }}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
