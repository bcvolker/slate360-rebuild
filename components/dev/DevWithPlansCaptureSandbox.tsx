"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { WithPlansCaptureCanvas } from "@/components/capture-v2/plan-canvas/WithPlansCaptureCanvas";
import { DEV_MOCK_SESSION } from "@/lib/dev/mock-site-walk";
import {
  DEV_MOCK_PLAN_SET,
  DEV_MOCK_PLAN_SHEETS,
  DEV_MOCK_PLAN_SHEET_IMAGE_URLS,
} from "@/lib/dev/mock-plan-sheets";
import { measurePlanCaptureChromeLayout } from "@/lib/dev/measure-plan-capture-chrome-layout";
import { useDevCaptureLoop } from "@/lib/dev/use-dev-capture-loop";
import type { CaptureV2Session } from "@/components/capture-v2/session-types";

export function DevWithPlansCaptureSandbox() {
  const searchParams = useSearchParams();
  const openPickerOnMount = searchParams?.get("picker") === "open";
  const loop = useDevCaptureLoop({ thumbCount: 3, liveMode: true });
  const session: CaptureV2Session = {
    ...DEV_MOCK_SESSION,
    project_id: DEV_MOCK_PLAN_SET.project_id,
    project_name: "Dev Plan Walk",
  };

  const measureKey = useMemo(
    () => `${loop.items.length}:${searchParams?.get("sheet") ?? "1"}`,
    [loop.items.length, searchParams],
  );

  useEffect(() => {
    if (!openPickerOnMount) return;
    const timer = window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>('[data-capture-chrome="plan-sheet-pill"]')?.click();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [openPickerOnMount]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const sample = measurePlanCaptureChromeLayout();
      if (!sample) return;
      const node = document.getElementById("dev-plan-capture-chrome-measure");
      if (node) node.textContent = JSON.stringify(sample);
    };
    const timer = window.setTimeout(run, 180);
    window.addEventListener("resize", run);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", run);
    };
  }, [measureKey]);

  return (
    <div className="h-full min-h-0">
      <WithPlansCaptureCanvas
        session={session}
        loop={loop}
        planSets={[DEV_MOCK_PLAN_SET]}
        planSheets={DEV_MOCK_PLAN_SHEETS}
        sheetImageUrls={DEV_MOCK_PLAN_SHEET_IMAGE_URLS}
      />
      <pre id="dev-plan-capture-chrome-measure" className="sr-only" aria-hidden />
    </div>
  );
}
