"use client";

import { useMemo, useState } from "react";
import { snapTime } from "@/lib/spatial-walkthrough/timeline-model";

export function useStudioTimeline(duration: number, snap: number[]) {
  const [pxPerSec, setPxPerSec] = useState(36);
  const [inT, setInT] = useState<number | null>(null);
  const [outT, setOutT] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const width = Math.max(320, Math.round(Math.max(duration, 1) * pxPerSec));

  const xOf = (t: number) => (t / Math.max(duration, 0.001)) * width;
  const tOf = (x: number) => snapTime((x / width) * Math.max(duration, 0), snap);

  const zoom = (dir: 1 | -1) => {
    setPxPerSec((p) => Math.min(160, Math.max(12, Math.round(p * (dir > 0 ? 1.25 : 0.8)))));
  };

  return useMemo(
    () => ({ pxPerSec, width, xOf, tOf, zoom, inT, outT, setInT, setOutT, selectedId, setSelectedId }),
    [pxPerSec, width, inT, outT, selectedId, duration, snap],
  );
}

export type StudioTimelineApi = ReturnType<typeof useStudioTimeline>;
