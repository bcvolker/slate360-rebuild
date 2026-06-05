"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { preloadCaptureV2Image } from "./capture-v2-preview-url";
import { CAPTURE_V2_LAYER_IDS, CAPTURE_V2_LAYERS } from "./layers";

const CANVAS_OS_SAFETY =
  "touch-manipulation select-none [-webkit-touch-callout:none] [-webkit-user-select:none]";

type Props = {
  imageUrl: string;
  title: string;
  localFallbackUrl?: string | null;
};

function pickStableLocalUrl(imageUrl: string, localFallbackUrl?: string | null): string | null {
  if (imageUrl.startsWith("blob:")) return imageUrl;
  if (localFallbackUrl?.startsWith("blob:")) return localFallbackUrl;
  return null;
}

export function CaptureV2StaticPreview({ imageUrl, title, localFallbackUrl }: Props) {
  const stableLocalRef = useRef<string | null>(pickStableLocalUrl(imageUrl, localFallbackUrl));
  const [displayUrl, setDisplayUrl] = useState(imageUrl);
  const [loadFailed, setLoadFailed] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    const stableLocal = pickStableLocalUrl(imageUrl, localFallbackUrl);
    if (stableLocal) stableLocalRef.current = stableLocal;
    setLoadFailed(false);

    if (imageUrl.startsWith("blob:")) {
      setDisplayUrl(imageUrl);
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const fallback = stableLocalRef.current;
    if (fallback) {
      setDisplayUrl(fallback);
      let cancelled = false;
      void preloadCaptureV2Image(imageUrl).then((ok) => {
        if (cancelled || !ok) return;
        setDisplayUrl(imageUrl);
      });
      return () => {
        cancelled = true;
      };
    }

    setDisplayUrl(imageUrl);
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [imageUrl, localFallbackUrl]);

  const handleImageError = useCallback(() => {
    const fallback = stableLocalRef.current;
    if (fallback && displayUrl !== fallback) {
      setDisplayUrl(fallback);
      return;
    }
    setLoadFailed(true);
  }, [displayUrl]);

  function onTouchStart(event: React.TouchEvent) {
    if (event.touches.length === 2) {
      event.preventDefault();
      panRef.current = null;
      const [a, b] = [event.touches[0]!, event.touches[1]!];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { distance, scale };
      return;
    }
    if (event.touches.length === 1 && scale > 1) {
      const touch = event.touches[0]!;
      panRef.current = { x: pan.x, y: pan.y, originX: touch.clientX, originY: touch.clientY };
    }
  }

  function onTouchMove(event: React.TouchEvent) {
    if (event.touches.length === 2 && pinchRef.current) {
      event.preventDefault();
      const [a, b] = [event.touches[0]!, event.touches[1]!];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = distance / pinchRef.current.distance;
      setScale(Math.min(3, Math.max(1, pinchRef.current.scale * ratio)));
      return;
    }
    if (event.touches.length === 1 && panRef.current && scale > 1) {
      event.preventDefault();
      const touch = event.touches[0]!;
      setPan({
        x: panRef.current.x + (touch.clientX - panRef.current.originX),
        y: panRef.current.y + (touch.clientY - panRef.current.originY),
      });
    }
  }

  function onTouchEnd() {
    pinchRef.current = null;
    panRef.current = null;
  }

  return (
    <div
      id={CAPTURE_V2_LAYER_IDS.canvasBase}
      className={`relative ${CAPTURE_V2_LAYERS.canvas} flex min-h-0 flex-1 flex-col overflow-hidden border border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] ${CANVAS_OS_SAFETY}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {!loadFailed ? (
          <img
            src={displayUrl}
            alt={title}
            className="absolute inset-0 z-[1] h-full w-full object-cover"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
            draggable={false}
            onError={handleImageError}
          />
        ) : null}
      </div>
    </div>
  );
}
