"use client";

import { useState } from "react";
import type { VnextHeroResult } from "@/lib/vnext/portfolio-types";

type Props = {
  hero: VnextHeroResult;
};

export function VnextProjectHero({ hero }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(hero.url) && !failed;

  return (
    <div className="vnext-hero relative overflow-hidden">
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
