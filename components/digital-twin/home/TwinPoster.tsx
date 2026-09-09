"use client";

import { useState } from "react";
import { Boxes } from "lucide-react";

/**
 * A twin's thumbnail. Loads the server-resized poster when the twin has one;
 * otherwise (or when the request fails) the twin-blue placeholder. Purely
 * presentational — size and radius come from `className`.
 */
export function TwinPoster({
  spaceId,
  hasPoster,
  width = 320,
  className = "",
  alt = "",
}: {
  spaceId: string;
  hasPoster: boolean;
  width?: number;
  className?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = hasPoster && !failed;
  return (
    <span
      className={`relative block overflow-hidden border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] ${className}`}
      data-twin-poster={showImage ? "image" : "placeholder"}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- authenticated, resized on the server
        <img
          src={`/api/digital-twin/spaces/${encodeURIComponent(spaceId)}/poster?w=${width}`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[var(--twin360-blue)]">
          <Boxes className="h-[38%] w-[38%]" strokeWidth={1.5} aria-hidden />
        </span>
      )}
    </span>
  );
}
