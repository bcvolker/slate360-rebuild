"use client";

import { useEffect, useState } from "react";
import { CAPTURE_V2_LAYER_IDS, CAPTURE_V2_LAYERS } from "./layers";

type Props = {
  imageUrl: string;
  title: string;
};

export function CaptureV2StaticPreview({ imageUrl, title }: Props) {
  const [displayUrl, setDisplayUrl] = useState(imageUrl);

  useEffect(() => {
    setDisplayUrl(imageUrl);
  }, [imageUrl]);

  return (
    <div
      id={CAPTURE_V2_LAYER_IDS.canvasBase}
      className={`relative ${CAPTURE_V2_LAYERS.canvas} flex min-h-0 flex-1 flex-col overflow-hidden border border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)]`}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <img
          src={displayUrl}
          alt={title}
          className="absolute inset-0 z-[1] h-full w-full object-cover"
          draggable={false}
          onError={() => {
            if (displayUrl !== imageUrl) setDisplayUrl(imageUrl);
          }}
        />
      </div>
    </div>
  );
}
