"use client";

import { useState } from "react";
import type { VnextHeroResult } from "@/lib/vnext/portfolio-types";

type Props = {
  hero: VnextHeroResult;
  /** Fill the parent (grid/flex) cell instead of the fixed 4:3 portfolio-card box. */
  fill?: boolean;
};

export function VnextProjectHero({ hero, fill = false }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(hero.url) && !failed;
  const baseClass = fill
    ? "relative h-full min-h-[16rem] w-full overflow-hidden bg-[color-mix(in_srgb,var(--vnext-ink)_7%,var(--vnext-canvas))]"
    : "vnext-hero relative overflow-hidden";

  return (
    <div className={baseClass}>
      {showImage ? (
        // Fixture and signed media URLs are not in the Next image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero.url ?? ""}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
