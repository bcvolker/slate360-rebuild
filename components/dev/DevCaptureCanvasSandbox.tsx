"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { NoPlansCaptureCanvas } from "@/components/capture-v2/NoPlansCaptureCanvas";
import { measureCaptureChromeLayout } from "@/lib/dev/measure-capture-chrome-layout";
import { useDevCaptureLoop } from "@/lib/dev/use-dev-capture-loop";
import { DEV_MOCK_CONTEXT_LABEL, DEV_MOCK_SESSION } from "@/lib/dev/mock-site-walk";

export const DEV_CAPTURE_THUMB_COUNTS = [0, 1, 5, 12] as const;

function parseThumbCount(value: string | null): (typeof DEV_CAPTURE_THUMB_COUNTS)[number] {
  const parsed = Number.parseInt(value ?? "", 10);
  return DEV_CAPTURE_THUMB_COUNTS.includes(parsed as (typeof DEV_CAPTURE_THUMB_COUNTS)[number])
    ? (parsed as (typeof DEV_CAPTURE_THUMB_COUNTS)[number])
    : 0;
}

export function DevCaptureCanvasSandbox() {
  const searchParams = useSearchParams();
  const thumbCount = parseThumbCount(searchParams?.get("thumbs") ?? null);
  const loop = useDevCaptureLoop({ thumbCount, liveMode: true });

  const measureKey = useMemo(
    () => `${thumbCount}:${loop.items.length}`,
    [loop.items.length, thumbCount],
  );

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const sample = measureCaptureChromeLayout(thumbCount);
      if (!sample) return;
      const node = document.getElementById("dev-capture-chrome-measure");
      if (node) node.textContent = JSON.stringify(sample);
    };

    const timer = window.setTimeout(run, 120);
    window.addEventListener("resize", run);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", run);
    };
  }, [measureKey, thumbCount]);

  return (
    <div className="h-full min-h-0">
      <NoPlansCaptureCanvas
        session={DEV_MOCK_SESSION}
        loop={loop}
        contextLabel={DEV_MOCK_CONTEXT_LABEL}
      />
      <pre id="dev-capture-chrome-measure" className="sr-only" aria-hidden />
    </div>
  );
}
